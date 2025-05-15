import sqlite3
import json
from datetime import datetime, timedelta
import hashlib
import secrets

class Database:
    def __init__(self, db_name='customer_analytics.db'):
        self.db_name = db_name
        self._create_tables()
    
    def _create_tables(self):
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        
        # Create analytics table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS analytics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            total_count INTEGER,
            male_count INTEGER,
            female_count INTEGER,
            young_count INTEGER,
            adult_count INTEGER,
            middle_aged_count INTEGER,
            elderly_count INTEGER
        )
        ''')
        
        # Create staff table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS staff (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            age INTEGER,
            gender TEXT,
            experience_level TEXT,
            assigned TEXT
        )
        ''')
        
        # Create recommendations table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS recommendations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            recommendation TEXT,
            applied BOOLEAN DEFAULT 0
        )
        ''')
        
        # Create users table for authentication
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            email TEXT UNIQUE,
            position TEXT,
            created_at TEXT,
            last_login TEXT,
            is_active BOOLEAN DEFAULT 1
        )
        ''')
        
                # START: Thêm bảng Lịch Sử Hoạt Động (activity_logs)
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            user_id INTEGER,
            username TEXT,
            action_type TEXT NOT NULL,
            object_type TEXT,
            object_id INTEGER,
            details TEXT,
            ip_address TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        ''')
        # END: Thêm bảng Lịch Sử Hoạt Động
        
        # Check if admin user exists, create if not
        cursor.execute("SELECT * FROM users WHERE username = 'admin'")
        if not cursor.fetchone():
            # Create default admin user (admin/admin123)
            hashed_password = self._hash_password('admin123')
            now = datetime.now().isoformat()
            cursor.execute('''
            INSERT INTO users (username, password_hash, full_name, email, position, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ''', ('admin', hashed_password, 'Administrator', 'admin@example.com', 'admin', now))
        
        conn.commit()
        conn.close()
    
    def _hash_password(self, password):
        """Hash a password for storing"""
        salt = secrets.token_hex(8)
        h = hashlib.sha256()
        h.update(f"{salt}:{password}".encode())
        return f"{salt}:{h.hexdigest()}"
    
    def _verify_password(self, stored_password, provided_password):
        """Verify a stored password against a provided password"""
        salt, hash = stored_password.split(':')
        h = hashlib.sha256()
        h.update(f"{salt}:{provided_password}".encode())
        return h.hexdigest() == hash
    
    # User management methods
    def create_user(self, username, password, full_name, email, position):
        """Create a new user"""
        try:
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()
            
            # Check if username already exists
            cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
            if cursor.fetchone():
                return False, "Username already exists"
            
            # Check if email already exists
            cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
            if cursor.fetchone():
                return False, "Email already exists"
            
            # Hash password and save user
            hashed_password = self._hash_password(password)
            now = datetime.now().isoformat()
            
            cursor.execute('''
            INSERT INTO users (username, password_hash, full_name, email, position, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ''', (username, hashed_password, full_name, email, position, now))
            
            conn.commit()
            return True, "User created successfully"
        except Exception as e:
            return False, str(e)
        finally:
            conn.close()
    
    def authenticate_user(self, username, password):
        """Authenticate a user by username and password"""
        try:
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()
            
            cursor.execute("SELECT id, username, password_hash, full_name, position FROM users WHERE username = ? AND is_active = 1", (username,))
            user = cursor.fetchone()
            
            if not user:
                return None, "Invalid username or user is not active"
            
            user_id, username, password_hash, full_name, position = user
            
            if not self._verify_password(password_hash, password):
                return None, "Invalid password"
            
            # Update last login time
            now = datetime.now().isoformat()
            cursor.execute("UPDATE users SET last_login = ? WHERE id = ?", (now, user_id))
            conn.commit()
            
            return {
                "id": user_id,
                "username": username,
                "full_name": full_name,
                "position": position
            }, "Authentication successful"
        except Exception as e:
            return None, str(e)
        finally:
            conn.close()
    
    def get_all_users(self):
        """Get all users (excluding password hash)"""
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, username, full_name, email, position, created_at, last_login, is_active FROM users")
        rows = cursor.fetchall()
        conn.close()
        
        users = []
        for row in rows:
            users.append({
                "id": row[0],
                "username": row[1],
                "full_name": row[2],
                "email": row[3],
                "position": row[4],
                "created_at": row[5],
                "last_login": row[6],
                "is_active": bool(row[7])
            })
        
        return users
    
    def update_user(self, user_id, data):
        """Update user information (excluding password)"""
        try:
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()
            
            # Build dynamic update query based on provided data
            update_fields = []
            update_values = []
            
            for field, value in data.items():
                if field in ['full_name', 'email', 'position', 'is_active']:
                    update_fields.append(f"{field} = ?")
                    update_values.append(value)
            
            if not update_fields:
                return False, "No valid fields to update"
            
            query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = ?"
            update_values.append(user_id)
            
            cursor.execute(query, tuple(update_values))
            conn.commit()
            
            return True, "User updated successfully"
        except Exception as e:
            return False, str(e)
        finally:
            conn.close()
    
    def change_password(self, user_id, current_password, new_password):
        """Change user password"""
        try:
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()
            
            # Get current password hash
            cursor.execute("SELECT password_hash FROM users WHERE id = ?", (user_id,))
            result = cursor.fetchone()
            
            if not result:
                return False, "User not found"
            
            password_hash = result[0]
            
            # Verify current password
            if not self._verify_password(password_hash, current_password):
                return False, "Current password is incorrect"
            
            # Update to new password
            new_password_hash = self._hash_password(new_password)
            cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_password_hash, user_id))
            conn.commit()
            
            return True, "Password changed successfully"
        except Exception as e:
            return False, str(e)
        finally:
            conn.close()
    
    def save_analysis(self, analysis_data):
        """Save analysis results to database"""
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        
        timestamp = analysis_data.get('timestamp', datetime.now().isoformat())
        total_count = analysis_data.get('total_count', 0)
        male_count = analysis_data.get('male_count', 0)
        female_count = analysis_data.get('female_count', 0)
        
        age_groups = analysis_data.get('age_groups', {})
        young_count = age_groups.get('young', 0)
        adult_count = age_groups.get('adult', 0)
        middle_aged_count = age_groups.get('middle_aged', 0)
        elderly_count = age_groups.get('elderly', 0)
        
        cursor.execute('''
        INSERT INTO analytics (
            timestamp, total_count, male_count, female_count,
            young_count, adult_count, middle_aged_count, elderly_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            timestamp, total_count, male_count, female_count,
            young_count, adult_count, middle_aged_count, elderly_count
        ))
        
        conn.commit()
        conn.close()
    
    def get_historical_data(self, days=7):
        """Get historical data for the last n days"""
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        
        # Calculate date for n days ago
        start_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        cursor.execute('''
        SELECT timestamp, total_count, male_count, female_count,
               young_count, adult_count, middle_aged_count, elderly_count
        FROM analytics
        WHERE timestamp >= ?
        ORDER BY timestamp
        ''', (start_date,))
        
        rows = cursor.fetchall()
        conn.close()
        
        # Format data for charting
        data = []
        for row in rows:
            data.append({
                "timestamp": row[0],
                "total_count": row[1],
                "male_count": row[2],
                "female_count": row[3],
                "age_groups": {
                    "young": row[4],
                    "adult": row[5],
                    "middle_aged": row[6],
                    "elderly": row[7]
                }
            })
        
        return data
    
    def add_staff(self, name, age, gender, experience_level):
        """Add a new staff member"""
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        
        cursor.execute('''
        INSERT INTO staff (name, age, gender, experience_level)
        VALUES (?, ?, ?, ?)
        ''', (name, age, gender, experience_level))
        
        conn.commit()
        conn.close()
    
    def get_all_staff(self):
        """Get all staff members"""
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        
        cursor.execute('SELECT id, name, age, gender, experience_level FROM staff')
        
        rows = cursor.fetchall()
        conn.close()
        
        staff = []
        for row in rows:
            staff.append({
                "id": row[0],
                "name": row[1],
                "age": row[2],
                "gender": row[3],
                "experience_level": row[4]
            })
        
        return staff
    
    def delete_staff(self, staff_id):
        """Delete a staff member by ID"""
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM staff WHERE id = ?', (staff_id,))
        
        conn.commit()
        conn.close()
