# Common Errors

This document outlines some common errors that can occur across multiple API endpoints. These errors are usually the result of input validation.

- **400 Bad Request**
  - "Input value is not string": This error occurs when an input parameter that should be a string is of a different data type.
  - "Input value is empty character string": This error occurs when an input parameter that should be a non-empty string is an empty string.
  - "Invalid ID: _id": This error occurs when an `_id` provided does not match the format of a valid MongoDB ObjectId.

These error responses are thrown by the helper functions `parseString` and `parseId` used across various API routes. Please ensure to handle these common errors in your application.
