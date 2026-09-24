CREATE DATABASE NOTED;

USE NOTED;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    bio VARCHAR(255),
    title VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_name VARCHAR(50) NOT NULL,
    module_window_offset BIGINT DEFAULT 0
);

CREATE TABLE modules (
    id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    project_id INT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    data LONGTEXT,
    xPos BIGINT DEFAULT 0,
    yPos BIGINT DEFAULT 0,
    title TINYTEXT
);

CREATE TABLE user_projects (
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    project_id INT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id)
)