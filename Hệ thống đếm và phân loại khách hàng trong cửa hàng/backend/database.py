import sqlite3
import json
from datetime import datetime, timedelta

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
        
        conn.commit()
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
