# nodeunit-httpclient

[![npm version](https://img.shields.io/npm/v/nodeunit-httpclient.svg)](https://www.npmjs.com/package/nodeunit-httpclient)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Lightweight HTTP/HTTPS client with built-in testing assertions for Nodeunit.

## ✨ Features

- ✅ Simple API for HTTP/HTTPS requests
- ✅ Built-in assertions for Nodeunit tests
- ✅ Support for GET, POST, PUT, DELETE, HEAD, OPTIONS, TRACE, CONNECT
- ✅ Automatic JSON parsing
- ✅ Configurable timeouts
- ✅ Basic authentication support
- ✅ Query string handling
- ✅ No external dependencies (uses native Node.js modules)

## 📦 Installation

```bash
npm install nodeunit-httpclient
```
## 🚀 Quick Start

```js
const HttpClient = require('nodeunit-httpclient');

const api = new HttpClient({
  protocol: 'https',
  host: 'api.example.com',
  port: 443,
  path: '/v1'
});

// Simple GET request
api.get(null, '/users', function(response) {
  console.log(response.statusCode); // 200
  console.log(response.data);       // Parsed JSON
});

```