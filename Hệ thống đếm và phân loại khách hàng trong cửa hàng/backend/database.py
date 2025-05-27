# hello
import redis
import json
import hashlib
import datetime
import uuid
import os
import logging
import time
from typing import Dict, List, Any, Optional, Union

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("database")

# Redis connection configuration
REDIS_HOST = os.environ.get('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.environ.get('REDIS_PORT', 6379))
REDIS_DB = int(os.environ.get('REDIS_DB', 0))
REDIS_PASSWORD = os.environ.get('REDIS_PASSWORD', None)
REDIS_SSL = os.environ.get('REDIS_SSL', 'False').lower() == 'true'

# Redis key prefixes
KEY_PREFIX = "customer_counter:"
USER_PREFIX = f"{KEY_PREFIX}user:"
STAFF_PREFIX = f"{KEY_PREFIX}staff:"
DETECTION_PREFIX = f"{KEY_PREFIX}detection:"
TOKEN_PREFIX = f"{KEY_PREFIX}token:"
EVENT_PREFIX = f"{KEY_PREFIX}event:"

# Admin registration secret code
ADMIN_SECRET_CODE = os.environ.get('ADMIN_SECRET_CODE', 'ADMIN123')

# Redis connection instance
_redis_client = None

def get_redis_client() -> redis.Redis:
    """Get or create Redis client instance with connection pooling"""
    global _redis_client
    import redis  # Re-import to ensure it's available in the local scope
    
    if _redis_client is None:
        try:
            # Configure connection parameters
            connection_kwargs = {
                'host': REDIS_HOST,
                'port': REDIS_PORT,
                'db': REDIS_DB,
                'password': REDIS_PASSWORD,
                'decode_responses': True  # Auto-decode responses to strings
            }
            
            # Handle SSL connection differently based on Redis version
            if REDIS_SSL:
                try:
                    # For newer Redis-py versions
                    import redis.connection
                    if hasattr(redis.connection, 'SSLConnection'):
                        connection_kwargs['connection_class'] = redis.connection.SSLConnection
                    else:
                        logger.warning("SSL Connection requested but not directly supported. Trying without SSL.")
                except ImportError:
                    logger.warning("Could not import Redis SSLConnection. Trying without SSL.")
            
            # Create a connection pool
            pool = redis.ConnectionPool(**connection_kwargs)
            
            # Create Redis client
            _redis_client = redis.Redis(connection_pool=pool)
            
            # Test connection
            _redis_client.ping()
            logger.info(f"Connected to Redis at {REDIS_HOST}:{REDIS_PORT}/db{REDIS_DB} {'with SSL' if REDIS_SSL else 'without SSL'}")
            
            # Create default admin user if not exists
            _create_default_admin()
            
        except redis.exceptions.ConnectionError as e:
            logger.error(f"Redis connection error: {e}")
            
            # Try connecting without SSL if SSL was enabled and connection failed
            if REDIS_SSL:
                logger.warning("Trying to connect without SSL...")
                try:
                    connection_kwargs = {
                        'host': REDIS_HOST,
                        'port': REDIS_PORT,
                        'db': REDIS_DB,
                        'password': REDIS_PASSWORD,
                        'decode_responses': True
                    }
                    pool = redis.ConnectionPool(**connection_kwargs)
                    _redis_client = redis.Redis(connection_pool=pool)
                    _redis_client.ping()
                    logger.info(f"Connected to Redis without SSL at {REDIS_HOST}:{REDIS_PORT}/db{REDIS_DB}")
                    _create_default_admin()
                    return _redis_client
                except Exception as e2:
                    logger.error(f"Redis connection also failed without SSL: {e2}")
            
            # Fallback to in-memory storage for development/testing
            logger.warning("Using in-memory fallback storage (data will not persist)")
            _redis_client = InMemoryRedis()
    
    return _redis_client

class InMemoryRedis:
    """Simple in-memory implementation for development without Redis"""
    def __init__(self):
        self.data = {}
        self.sets = {}
        self.lists = {}
        self.expirations = {}
        logger.warning("Using in-memory Redis mock. Data will not persist!")
    
    def ping(self):
        return True
    
    def set(self, key, value, ex=None, nx=False):
        if nx and key in self.data:
            return False
        self.data[key] = value
        if ex:
            self.expirations[key] = time.time() + ex
        return True
    
    def get(self, key):
        self._check_expiration(key)
        return self.data.get(key)
    
    def delete(self, *keys):
        count = 0
        for key in keys:
            if key in self.data:
                del self.data[key]
                if key in self.expirations:
                    del self.expirations[key]
                count += 1
        return count
    
    def exists(self, key):
        self._check_expiration(key)
        return key in self.data
    
    def keys(self, pattern="*"):
        # Basic pattern matching with * as wildcard
        self._check_all_expirations()
        result = []
        if pattern == "*":
            return list(self.data.keys())
        
        # Handle prefix* pattern
        if pattern.endswith("*") and not pattern.startswith("*"):
            prefix = pattern[:-1]
            return [k for k in self.data.keys() if k.startswith(prefix)]
        
        # We don't handle more complex patterns for this mock
        logger.warning(f"Complex pattern matching not supported in mock: {pattern}")
        return []
    
    def hset(self, name, key=None, value=None, mapping=None):
        self._ensure_hash(name)
        if mapping:
            self.data[name].update(mapping)
            return len(mapping)
        else:
            self.data[name][key] = value
            return 1
    
    def hget(self, name, key):
        self._check_expiration(name)
        return self.data.get(name, {}).get(key)
    
    def hgetall(self, name):
        self._check_expiration(name)
        return self.data.get(name, {})
    
    def hdel(self, name, *keys):
        self._check_expiration(name)
        if name not in self.data:
            return 0
        count = 0
        for key in keys:
            if key in self.data[name]:
                del self.data[name][key]
                count += 1
        return count
    
    def sadd(self, name, *values):
        if name not in self.sets:
            self.sets[name] = set()
        count = 0
        for val in values:
            if val not in self.sets[name]:
                self.sets[name].add(val)
                count += 1
        return count
    
    def smembers(self, name):
        return self.sets.get(name, set())
    
    def srem(self, name, *values):
        if name not in self.sets:
            return 0
        count = 0
        for val in values:
            if val in self.sets[name]:
                self.sets[name].remove(val)
                count += 1
        return count
    
    def lpush(self, name, *values):
        if name not in self.lists:
            self.lists[name] = []
        for val in values:
            self.lists[name].insert(0, val)
        return len(self.lists[name])
    
    def lrange(self, name, start, end):
        if name not in self.lists:
            return []
        
        # Handle negative indices
        if end < 0:
            end = len(self.lists[name]) + end + 1
        
        return self.lists[name][start:end]
    
    def expire(self, name, time_seconds):
        if name in self.data:
            self.expirations[name] = time.time() + time_seconds
            return 1
        return 0
    
    def _check_expiration(self, key):
        if key in self.expirations and time.time() > self.expirations[key]:
            del self.data[key]
            del self.expirations[key]
            return True
        return False
    
    def _check_all_expirations(self):
        for key in list(self.expirations.keys()):
            self._check_expiration(key)
    
    def _ensure_hash(self, name):
        if name not in self.data:
            self.data[name] = {}
        elif not isinstance(self.data[name], dict):
            self.data[name] = {}

def _create_default_admin():
    """Create a default admin user if not exists"""
    redis_client = get_redis_client()
    admin_key = f"{USER_PREFIX}admin"
    
    # Check if admin user exists
    if not redis_client.exists(admin_key):
        # Create default admin
        password_hash = hashlib.sha256("admin123".encode()).hexdigest()
        
        admin_data = {
            "username": "admin",
            "password_hash": password_hash,
            "full_name": "System Administrator",
            "email": "admin@example.com",
            "role": "admin",
            "created_at": datetime.datetime.now().isoformat()
        }
        
        # Save to Redis
        redis_client.hset(admin_key, mapping=admin_data)
        logger.info("Created default admin user (username: admin, password: admin123)")
        
        # Add to users set
        redis_client.sadd(f"{USER_PREFIX}all", "admin")

# ==================== User Authentication Functions ====================

def authenticate_user(access_code: str) -> Union[Dict[str, Any], None]:
    """Authenticate a user using access code (NHANVIEN or ADMIN)"""
    redis_client = get_redis_client()
    
    # Normalize access code: trim whitespace and convert to uppercase
    if access_code:
        access_code = access_code.strip().upper()
    
    # Log the authentication attempt
    logger.info(f"Authentication attempt with access code: {access_code}")
    
    # Check the access code
    if access_code not in ["NHANVIEN", "ADMIN"]:
        logger.warning(f"Invalid access code attempted: {access_code}")
        return None
    
    # Generate token
    token = str(uuid.uuid4())
    username = "admin" if access_code == "ADMIN" else "nhanvien"
    token_data = {
        "username": username,
        "created_at": datetime.datetime.now().isoformat(),
        "role": "admin" if access_code == "ADMIN" else "staff"
    }
    
    # Save token with 24-hour expiration
    token_key = f"{TOKEN_PREFIX}{token}"
    try:
        redis_client.hset(token_key, mapping=token_data)
        redis_client.expire(token_key, 86400)  # 24 hours
        logger.info(f"Successfully created token for user: {username}")
    except Exception as e:
        logger.error(f"Error storing token in Redis: {e}")
        return None
    
    # Create user response
    user_response = {
        "username": username,
        "full_name": "Administrator" if access_code == "ADMIN" else "Staff Member",
        "email": "",
        "role": "admin" if access_code == "ADMIN" else "staff"
    }
    
    return {
        "token": token,
        "user": user_response
    }

# Keep this function as-is for token verification
def verify_token(token: str) -> Union[Dict[str, Any], None]:
    """Verify authentication token"""
    redis_client = get_redis_client()
    token_key = f"{TOKEN_PREFIX}{token}"
    
    # Check if token exists
    if not redis_client.exists(token_key):
        return None
    
    # Get token data
    token_data = redis_client.hgetall(token_key)
    
    # Create user response based on role
    if token_data.get('role') == 'admin':
        user_response = {
            "username": "admin",
            "full_name": "Administrator",
            "email": "",
            "role": "admin"
        }
    else:
        user_response = {
            "username": "nhanvien",
            "full_name": "Staff Member",
            "email": "",
            "role": "staff"
        }
    
    return user_response

# We can keep this function but it's simplified now
def register_user(username: str, password: str, full_name: str, email: str, role: str, secret_code: str) -> Dict[str, Any]:
    """This function is now deprecated and will always return an error"""
    return {"success": False, "message": "Registration is disabled, please use access codes ADMIN or NHANVIEN to login"}

def change_password(username: str, current_password: str, new_password: str) -> Dict[str, Any]:
    """Change user password"""
    redis_client = get_redis_client()
    user_key = f"{USER_PREFIX}{username}"
    
    # Check if user exists
    if not redis_client.exists(user_key):
        return {"success": False, "message": "User not found"}
    
    # Get user data
    user_data = redis_client.hgetall(user_key)
    
    # Verify current password
    current_password_hash = hashlib.sha256(current_password.encode()).hexdigest()
    if user_data["password_hash"] != current_password_hash:
        return {"success": False, "message": "Current password is incorrect"}
    
    # Update password
    new_password_hash = hashlib.sha256(new_password.encode()).hexdigest()
    redis_client.hset(user_key, "password_hash", new_password_hash)
    
    return {"success": True, "message": "Password changed successfully"}

def get_all_users() -> List[Dict[str, Any]]:
    """Get all users (for admin interface)"""
    redis_client = get_redis_client()
    users = []
    
    # Get all usernames
    usernames = redis_client.smembers(f"{USER_PREFIX}all")
    
    for username in usernames:
        user_key = f"{USER_PREFIX}{username}"
        if redis_client.exists(user_key):
            user_data = redis_client.hgetall(user_key)
            # Remove password hash
            if "password_hash" in user_data:
                del user_data["password_hash"]
            users.append(user_data)
    
    return users

# ==================== Staff Management Functions ====================

def add_staff(name: str, age: int, gender: str, experience_level: str) -> Dict[str, Any]:
    """Add a new staff member"""
    try:
        redis_client = get_redis_client()
        
        # Generate ID
        staff_id = str(int(time.time()))
        staff_key = f"{STAFF_PREFIX}{staff_id}"
        
        # Create staff data
        staff_data = {
            "id": staff_id,
            "name": name,
            "age": age,
            "gender": gender,
            "experience_level": experience_level,
            "created_at": datetime.datetime.now().isoformat()
        }
        
        # Save to Redis
        redis_client.hset(staff_key, mapping=staff_data)
        
        # Add to staff set
        redis_client.sadd(f"{STAFF_PREFIX}all", staff_id)
        
        logger.info(f"Added new staff: {name} with ID {staff_id}")
        return {"success": True, "message": "Staff added successfully", "staff_id": staff_id}
    except Exception as e:
        logger.error(f"Error adding staff: {e}")
        return {"success": False, "message": f"Error adding staff: {str(e)}"}

def update_staff(staff_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Update staff information"""
    try:
        redis_client = get_redis_client()
        staff_key = f"{STAFF_PREFIX}{staff_id}"
        
        # Check if staff exists
        if not redis_client.exists(staff_key):
            logger.warning(f"Attempted to update non-existent staff ID: {staff_id}")
            return {"success": False, "message": "Staff not found"}
        
        # Get current data
        current_data = redis_client.hgetall(staff_key)
        
        # Update fields
        for key, value in data.items():
            if key in ["name", "age", "gender", "experience_level"]:
                current_data[key] = value
        
        # Add updated timestamp
        current_data["updated_at"] = datetime.datetime.now().isoformat()
        
        # Save back to Redis
        redis_client.hset(staff_key, mapping=current_data)
        
        logger.info(f"Updated staff ID: {staff_id}")
        return {"success": True, "message": "Staff updated successfully"}
    except Exception as e:
        logger.error(f"Error updating staff {staff_id}: {e}")
        return {"success": False, "message": f"Error updating staff: {str(e)}"}

def delete_staff(staff_id: str) -> Dict[str, Any]:
    """Delete a staff member"""
    try:
        redis_client = get_redis_client()
        staff_key = f"{STAFF_PREFIX}{staff_id}"
        
        # Check if staff exists
        if not redis_client.exists(staff_key):
            logger.warning(f"Attempted to delete non-existent staff ID: {staff_id}")
            return {"success": False, "message": "Staff not found"}
        
        # Get name for logging
        staff_name = redis_client.hget(staff_key, "name")
        
        # Delete from Redis
        redis_client.delete(staff_key)
        
        # Remove from staff set
        redis_client.srem(f"{STAFF_PREFIX}all", staff_id)
        
        logger.info(f"Deleted staff ID: {staff_id}, Name: {staff_name}")
        return {"success": True, "message": "Staff deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting staff {staff_id}: {e}")
        return {"success": False, "message": f"Error deleting staff: {str(e)}"}

def get_staff(staff_id: str) -> Union[Dict[str, Any], None]:
    """Get staff information by ID"""
    redis_client = get_redis_client()
    staff_key = f"{STAFF_PREFIX}{staff_id}"
    
    # Check if staff exists
    if not redis_client.exists(staff_key):
        return None
    
    # Get staff data
    staff_data = redis_client.hgetall(staff_key)
    
    return staff_data

def get_all_staff() -> List[Dict[str, Any]]:
    """Get all staff members"""
    redis_client = get_redis_client()
    staff_list = []
    
    # Get all staff IDs
    staff_ids = redis_client.smembers(f"{STAFF_PREFIX}all")
    
    for staff_id in staff_ids:
        staff_key = f"{STAFF_PREFIX}{staff_id}"
        if redis_client.exists(staff_key):
            staff_data = redis_client.hgetall(staff_key)
            
            # Convert numeric fields
            if "age" in staff_data:
                staff_data["age"] = int(staff_data["age"])
            
            staff_list.append(staff_data)
    
    return staff_list

# ==================== Detection Data Functions ====================

def save_detection_data(total_count: int, male_count: int, female_count: int, age_groups: Dict[str, int], raw_data: Dict[str, Any] = None) -> None:
    """Save detection data for analytics"""
    redis_client = get_redis_client()
    
    # Generate timestamp and key
    timestamp = datetime.datetime.now().isoformat()
    detection_key = f"{DETECTION_PREFIX}{int(time.time())}"
    
    # Create detection data
    detection_data = {
        "timestamp": timestamp,
        "total_count": total_count,
        "male_count": male_count,
        "female_count": female_count,
        "age_groups": json.dumps(age_groups)
    }
    
    # Add raw data if provided
    if raw_data:
        detection_data["raw_data"] = json.dumps(raw_data)
    
    # Save to Redis
    redis_client.hset(detection_key, mapping=detection_data)
    
    # Add to time-ordered list (newest first)
    redis_client.lpush(f"{DETECTION_PREFIX}timeline", detection_key)
    
    # Trim list to keep only last 1000 entries
    redis_client.ltrim(f"{DETECTION_PREFIX}timeline", 0, 999)

def get_historical_data(days: int = 7) -> Dict[str, Any]:
    """Get historical detection data for the specified number of days"""
    redis_client = get_redis_client()
    
    # Calculate cutoff timestamp
    cutoff_time = datetime.datetime.now() - datetime.timedelta(days=days)
    cutoff_timestamp = cutoff_time.isoformat()
    
    # Get all detection keys from timeline
    detection_keys = redis_client.lrange(f"{DETECTION_PREFIX}timeline", 0, -1)
    
    data = []
    
    for key in detection_keys:
        # Get detection data
        detection_data = redis_client.hgetall(key)
        
        # Skip if timestamp is before cutoff
        if detection_data.get("timestamp", "") < cutoff_timestamp:
            continue
        
        # Parse age groups
        if "age_groups" in detection_data:
            try:
                detection_data["age_groups"] = json.loads(detection_data["age_groups"])
            except json.JSONDecodeError:
                detection_data["age_groups"] = {
                    "young": 0,
                    "adult": 0,
                    "middle_aged": 0,
                    "elderly": 0
                }
        
        # Convert numeric fields
        for field in ["total_count", "male_count", "female_count"]:
            if field in detection_data:
                try:
                    detection_data[field] = int(detection_data[field])
                except ValueError:
                    detection_data[field] = 0
        
        # Remove raw data to save bandwidth
        if "raw_data" in detection_data:
            del detection_data["raw_data"]
        
        data.append(detection_data)
    
    return {"success": True, "data": data}

# ==================== Event Management Functions ====================

def create_event(name: str, event_type: str, start_date: str, end_date: str, target_audience: List[str], 
                target_gender: str, description: str, target_count: int, success_threshold: int) -> Dict[str, Any]:
    """Create a new event"""
    redis_client = get_redis_client()
    
    # Generate ID
    event_id = str(int(time.time()))
    event_key = f"{EVENT_PREFIX}{event_id}"
    
    # Create event data
    event_data = {
        "id": event_id,
        "name": name,
        "type": event_type,
        "start_date": start_date,
        "end_date": end_date,
        "target_audience": json.dumps(target_audience),
        "target_gender": target_gender,
        "description": description,
        "target_count": target_count,
        "success_threshold": success_threshold,
        "created_at": datetime.datetime.now().isoformat(),
        "status": "upcoming",
        "visitor_count": 0,
        "target_match_percent": 0
    }
    
    # Save to Redis
    redis_client.hset(event_key, mapping=event_data)
    
    # Add to events set
    redis_client.sadd(f"{EVENT_PREFIX}all", event_id)
    
    return {"success": True, "message": "Event created successfully", "event_id": event_id}

def get_all_events() -> List[Dict[str, Any]]:
    """Get all events"""
    redis_client = get_redis_client()
    events = []
    
    try:
        # Get all event IDs
        event_ids = redis_client.smembers(f"{EVENT_PREFIX}all")
        
        for event_id in event_ids:
            # Decode bytes to string if needed
            if isinstance(event_id, bytes):
                event_id = event_id.decode('utf-8')
                
            event_key = f"{EVENT_PREFIX}{event_id}"
            if redis_client.exists(event_key):
                event_data_raw = redis_client.hgetall(event_key)
                
                # Convert all bytes to strings
                event_data = {}
                for key, value in event_data_raw.items():
                    if isinstance(key, bytes):
                        key = key.decode('utf-8')
                    if isinstance(value, bytes):
                        value = value.decode('utf-8')
                    event_data[key] = value
                
                # Parse JSON fields
                if "target_audience" in event_data:
                    try:
                        event_data["target_audience"] = json.loads(event_data["target_audience"])
                    except json.JSONDecodeError:
                        event_data["target_audience"] = []
                
                # Convert numeric fields
                for field in ["target_count", "visitor_count", "success_threshold", "target_match_percent"]:
                    if field in event_data:
                        try:
                            event_data[field] = int(event_data[field])
                        except (ValueError, TypeError):
                            event_data[field] = 0
                
                # Update event status based on current date
                current_date = datetime.datetime.now().isoformat()
                if event_data.get("start_date", "") <= current_date <= event_data.get("end_date", ""):
                    event_data["status"] = "active"
                elif current_date > event_data.get("end_date", ""):
                    event_data["status"] = "completed"
                else:
                    event_data["status"] = "upcoming"
                
                # Save updated status
                redis_client.hset(event_key, "status", event_data["status"])
                
                events.append(event_data)
    
    except Exception as e:
        print(f"Error getting all events: {e}")
        return []
    
    return events

def update_event_stats(event_id: str, visitor_count: int, target_match_percent: int) -> Dict[str, Any]:
    """Update event statistics"""
    redis_client = get_redis_client()
    event_key = f"{EVENT_PREFIX}{event_id}"
    
    # Check if event exists
    if not redis_client.exists(event_key):
        return {"success": False, "message": "Event not found"}
    
    # Update fields
    redis_client.hset(event_key, "visitor_count", visitor_count)
    redis_client.hset(event_key, "target_match_percent", target_match_percent)
    redis_client.hset(event_key, "updated_at", datetime.datetime.now().isoformat())
    
    return {"success": True, "message": "Event statistics updated successfully"}

def delete_event(event_id: str) -> Dict[str, Any]:
    """Delete an event"""
    redis_client = get_redis_client()
    event_key = f"{EVENT_PREFIX}{event_id}"
    
    # Check if event exists
    if not redis_client.exists(event_key):
        return {"success": False, "message": "Event not found"}
    
    # Delete from Redis
    redis_client.delete(event_key)
    
    # Remove from events set
    redis_client.srem(f"{EVENT_PREFIX}all", event_id)
    
    return {"success": True, "message": "Event deleted successfully"}

def update_event(event_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Update all event details"""
    redis_client = get_redis_client()
    event_key = f"{EVENT_PREFIX}{event_id}"
    
    # Check if event exists
    if not redis_client.exists(event_key):
        return {"success": False, "message": "Event not found"}
    
    # Get current data
    current_data = redis_client.hgetall(event_key)
    
    # Fields that can be updated
    updatable_fields = [
        "name", "type", "start_date", "end_date", "description", 
        "target_count", "success_threshold", "visitor_count", 
        "target_match_percent", "target_gender"
    ]
    
    # Update fields
    for field in updatable_fields:
        if field in data:
            current_data[field] = data[field]
    
    # Special handling for target_audience (JSON array)
    if "target_audience" in data:
        current_data["target_audience"] = json.dumps(data["target_audience"])
    
    # Add updated timestamp
    current_data["updated_at"] = datetime.datetime.now().isoformat()
    
    # Update status based on dates
    current_date = datetime.datetime.now().isoformat()
    if current_data["start_date"] <= current_date <= current_data["end_date"]:
        current_data["status"] = "active"
    elif current_date > current_data["end_date"]:
        current_data["status"] = "completed"
    else:
        current_data["status"] = "upcoming"
    
    # Save to Redis
    redis_client.hset(event_key, mapping=current_data)
    
    return {"success": True, "message": "Event updated successfully"}

# ==================== Settings Management Functions ====================
SETTINGS_PREFIX = f"{KEY_PREFIX}settings:"

def save_settings(settings_type: str, settings_data: Dict[str, Any]) -> Dict[str, Any]:
    """Save application settings
    
    Args:
        settings_type: Type of settings ('camera', 'system', or 'ai')
        settings_data: Dictionary containing settings values
    
    Returns:
        Dict with success status and message
    """
    try:
        redis_client = get_redis_client()
        settings_key = f"{SETTINGS_PREFIX}{settings_type}"
        
        # Add timestamp for when settings were last updated
        settings_data["updated_at"] = datetime.datetime.now().isoformat()
        
        # Save to Redis as JSON string to preserve types
        redis_client.set(settings_key, json.dumps(settings_data))
        
        logger.info(f"Saved {settings_type} settings")
        return {"success": True, "message": f"{settings_type.capitalize()} settings saved successfully"}
    except Exception as e:
        logger.error(f"Error saving {settings_type} settings: {e}")
        return {"success": False, "message": f"Error saving settings: {str(e)}"}

def get_settings(settings_type: str) -> Dict[str, Any]:
    """Get application settings
    
    Args:
        settings_type: Type of settings ('camera', 'system', or 'ai')
    
    Returns:
        Dict containing settings values with defaults if not found
    """
    try:
        redis_client = get_redis_client()
        settings_key = f"{SETTINGS_PREFIX}{settings_type}"
        
        # Get settings from Redis
        settings_json = redis_client.get(settings_key)
        
        if settings_json:
            return json.loads(settings_json)
        else:
            # Return default settings based on type
            if settings_type == "camera":
                return {
                    "detection_sensitivity": 50,
                    "camera_source": "0",
                    "rtsp_url": "",
                    "resolution": "hd"
                }
            elif settings_type == "system":
                return {
                    "enable_auto_restart": True,
                    "enable_notifications": True,
                    "data_retention_days": 30,
                    "backup_enabled": False,
                    "backup_interval_hours": 24
                }
            elif settings_type == "ai":
                return {
                    "face_detection_model": "ssd",
                    "min_face_size": 50,
                    "confidence_threshold": 0.6,
                    "detection_interval": 2.0
                }
            else:
                return {}
    except Exception as e:
        logger.error(f"Error getting {settings_type} settings: {e}")
        # Return empty dict on error
        return {}

def reset_settings(settings_type: str = None) -> Dict[str, Any]:
    """Reset settings to defaults
    
    Args:
        settings_type: Type of settings to reset, or None to reset all
    
    Returns:
        Dict with success status and message
    """
    try:
        redis_client = get_redis_client()
        
        if settings_type:
            # Reset specific settings type
            settings_key = f"{SETTINGS_PREFIX}{settings_type}"
            redis_client.delete(settings_key)
            logger.info(f"Reset {settings_type} settings to defaults")
            return {"success": True, "message": f"{settings_type.capitalize()} settings reset to defaults"}
        else:
            # Reset all settings
            settings_keys = redis_client.keys(f"{SETTINGS_PREFIX}*")
            if settings_keys:
                redis_client.delete(*settings_keys)
            logger.info("Reset all settings to defaults")
            return {"success": True, "message": "All settings reset to defaults"}
    except Exception as e:
        logger.error(f"Error resetting settings: {e}")
        return {"success": False, "message": f"Error resetting settings: {str(e)}"}

# ==================== Initialization ====================

# Initialize Redis client when module is loaded
get_redis_client()