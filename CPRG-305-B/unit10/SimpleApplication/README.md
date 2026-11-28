# Simple React App with Unit Testing

This project demonstrates a simple full-stack React application with unit testing using Jest and React Testing Library.

## Folder Structure

project-folder/
├── server/
│   ├── server.js
│   └── data.json
└── client/
├── package.json
├── public/
│   └── index.html
└── src/
├── App.js
└── App.test.js

## Prerequisites

* Node.js and npm (or yarn) installed.

## Instructions to Run

### 1. Backend (Server)

1.  Navigate to the `server` directory:

    ```bash
    cd project-folder/server
    ```

2.  Initialize a new npm project:

    ```bash
    npm init -y
    ```

3.  Install Express:

    ```bash
    npm install express
    ```

4.  Start the server:

    ```bash
    node server.js
    ```

    The server should now be running on port 5000.

### 2. Frontend (Client)

1.  Navigate to the `client` directory:

    ```bash
    cd ../client
    ```

2.  Create a new React application:

    ```bash
    npx create-react-app .
    ```

3.  Install required dependencies:

    ```bash
    npm install axios @testing-library/react @testing-library/jest-dom
    ```

4.  Replace the contents of `src/App.js` and create `src/App.test.js` with the provided code snippets.

5.  Start the React application:

    ```bash
    npm start
    ```

    The React application should now be running in your browser.

### 3. Running Unit Tests

1.  Ensure you are in the `client` directory:

    ```bash
    cd project-folder/client
    ```

2.  Run the unit tests:

    ```bash
    npm test
    ```

    Jest will execute the tests defined in `src/App.test.js` and display the results. You will see some tests that pass and some that fail as designed.

## Notes

* The backend server must be running before the frontend application is started.
* The tests are designed to demonstrate both passing and failing test cases.
* `axios` is mocked in the test file to simulate API responses.