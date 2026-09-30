CREATE DATABASE IF NOT EXISTS library_db;
USE library_db;

CREATE TABLE IF NOT EXISTS authors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    author_name VARCHAR(100) NOT NULL,
    nationality VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    author_id INT NOT NULL,
    category VARCHAR(50),
    publish_year INT,
    CONSTRAINT fk_books_authors FOREIGN KEY (author_id) 
        REFERENCES authors(id) 
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS borrow_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    borrower_name VARCHAR(100) NOT NULL,
    borrow_date DATE NOT NULL,
    return_date DATE NULL,
    CONSTRAINT fk_borrow_records_books FOREIGN KEY (book_id) 
        REFERENCES books(id) 
        ON DELETE CASCADE
);

INSERT INTO authors (author_name, nationality) VALUES
('J.K. Rowling', 'British'),
('Haruki Murakami', 'Japanese'),
('George Orwell', 'British');

INSERT INTO books (title, author_id, category, publish_year) VALUES
('Harry Potter and the Philosopher''s Stone', 1, 'Fantasy', 1997),
('Norwegian Wood', 2, 'Fiction', 1987),
('1984', 3, 'Dystopian', 1949);

INSERT INTO borrow_records (book_id, borrower_name, borrow_date, return_date) VALUES
(1, 'Tran Phan Duc Khai', '2026-09-15', '2026-09-25'),
(2, 'Nguyen Van A', '2026-09-18', NULL),
(3, 'Le Thi C', '2026-09-20', '2026-09-28');

SELECT 
    b.title AS `Book Title`,
    a.author_name AS `Author Name`,
    br.borrower_name AS `Borrower Name`,
    br.borrow_date AS `Borrow Date`
FROM borrow_records br
INNER JOIN books b ON br.book_id = b.id
INNER JOIN authors a ON b.author_id = a.id;