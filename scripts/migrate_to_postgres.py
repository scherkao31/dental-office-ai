#!/usr/bin/env python3
"""
Script to migrate data from SQLite to PostgreSQL
Usage: python migrate_to_postgres.py
"""

import os
import sys
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def get_sqlite_connection():
    """Get SQLite connection"""
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'dental_app.db')
    if not os.path.exists(db_path):
        # Try root directory
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'dental_app.db')
    
    if not os.path.exists(db_path):
        print(f"SQLite database not found. Tried: {db_path}")
        sys.exit(1)
    
    return sqlite3.connect(db_path)

def get_postgres_connection():
    """Get PostgreSQL connection from DATABASE_URL"""
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("DATABASE_URL environment variable not set")
        print("Usage: DATABASE_URL=postgresql://... python migrate_to_postgres.py")
        sys.exit(1)
    
    # Handle Render's postgres:// format
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    
    return psycopg2.connect(database_url)

def get_table_schema(conn, table_name):
    """Get table schema from SQLite"""
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info({table_name})")
    return cursor.fetchall()

def migrate_table(sqlite_conn, pg_conn, table_name):
    """Migrate a single table"""
    print(f"\nMigrating table: {table_name}")
    
    sqlite_cursor = sqlite_conn.cursor()
    pg_cursor = pg_conn.cursor()
    
    try:
        # Get all data from SQLite
        sqlite_cursor.execute(f"SELECT * FROM {table_name}")
        rows = sqlite_cursor.fetchall()
        
        if not rows:
            print(f"  No data in {table_name}")
            return
        
        # Get column names
        column_names = [description[0] for description in sqlite_cursor.description]
        
        # Prepare insert query
        placeholders = ', '.join(['%s'] * len(column_names))
        columns = ', '.join(column_names)
        insert_query = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"
        
        # Insert data
        for row in rows:
            pg_cursor.execute(insert_query, row)
        
        pg_conn.commit()
        print(f"  Migrated {len(rows)} rows")
        
    except Exception as e:
        pg_conn.rollback()
        print(f"  Error migrating {table_name}: {e}")

def main():
    """Main migration function"""
    print("Starting SQLite to PostgreSQL migration...")
    
    # Get connections
    sqlite_conn = get_sqlite_connection()
    pg_conn = get_postgres_connection()
    
    # Get list of tables
    sqlite_cursor = sqlite_conn.cursor()
    sqlite_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = [row[0] for row in sqlite_cursor.fetchall()]
    
    print(f"\nFound {len(tables)} tables to migrate:")
    for table in tables:
        print(f"  - {table}")
    
    # Migrate each table
    for table in tables:
        migrate_table(sqlite_conn, pg_conn, table)
    
    # Close connections
    sqlite_conn.close()
    pg_conn.close()
    
    print("\nMigration completed!")
    print("\nIMPORTANT: You may need to update sequences in PostgreSQL.")
    print("Run this SQL in your PostgreSQL database:")
    print("SELECT setval(pg_get_serial_sequence('table_name', 'id'), MAX(id)) FROM table_name;")
    print("(Replace 'table_name' with each of your tables)")

if __name__ == "__main__":
    main()