-- Enable replica identity for real-time functionality
ALTER TABLE roles REPLICA IDENTITY FULL;
ALTER TABLE profiles REPLICA IDENTITY FULL;
ALTER TABLE departments REPLICA IDENTITY FULL;