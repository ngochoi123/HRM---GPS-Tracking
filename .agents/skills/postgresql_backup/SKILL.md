---
name: postgresql-backup
description: Triggered when a PostgreSQL database backup is requested, or when performing maintenance, backup, or dump operations on the attendance database (attendance_db).
---

# PostgreSQL Backup Skill

## Description
This skill handles database backup operations for the `attendance_db` database on PostgreSQL.

## Trigger
- Explicit user requests to back up the database, dump `attendance_db`, or create a PostgreSQL backup.
- Pre-deployment or maintenance routines requiring a database snapshot.

## Workflow
When a database backup is requested, the agent must strictly run the following command to perform the backup:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -h localhost -p 5432 -d attendance_db -f backup.sql
```
