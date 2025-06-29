Initialize Backend

mkdir backend
cd backend
npm init -y

# Install dependencies
npm install express mysql2 cors dotenv bcryptjs jsonwebtoken
npm install -D @types/express @types/node @types/cors @types/bcryptjs @types/jsonwebtoken typescript ts-node nodemon

# Initialize TypeScript
npm install typescript
npx tsc --init


# Database init
Log in the database
sudo mysql -u root -p

-- Create the database
CREATE DATABASE opentable_clone;

-- Create a dedicated user for the application
CREATE USER 'dev'@'localhost' IDENTIFIED BY 'devpw';

-- Grant privileges to the user
GRANT ALL PRIVILEGES ON bookdb.* TO 'dev'@'localhost';

-- Refresh privileges
FLUSH PRIVILEGES;

-- Verify the database was created
SHOW DATABASES;

-- Verify the user was created
SELECT User, Host FROM mysql.user WHERE User = 'dev';

-- Exit MySQL
EXIT;

## Insert into database
# Navigate to your project directory where the SQL file is saved
cd book

# Execute the SQL file
mysql -u root -p bookdb < backend/src/config/schema.sql







#Initialize frontend
cd ../  # Go back to root
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd frontend

# Install additional dependencies
npm install axios 
npm install -D @types/node