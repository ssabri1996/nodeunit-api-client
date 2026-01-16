// src/httpclient.js

const http = require('http');
const https = require('https');
const querystring = require('querystring');

/**
 * HttpClient
 *
 * @param {Object} options:
 *   - protocol ('http' | 'https')   : default 'http'
 *   - auth ('username:password')    : basic auth
 *   - host ('localhost')
 *   - port (80 / 443 par défaut selon protocol)
 *   - path ('')                     : base path (e.g. '/api')
 *   - reqHeaders ({})               : default request headers
 *   - headers ({})                  : default expected response headers
 *   - status (Number|null)          : default expected status code
 *   - timeout (Number)              : request timeout in ms (default 30000)
 *   - debug (Boolean)               : enable debug logs (default false)
 */
function HttpClient(options) {
  options = options || {};

  this.protocol = options.protocol || 'http';
  this.auth = options.auth;
  this.host = options.host || 'localhost';

  if (typeof options.port !== 'undefined') {
    this.port = options.port;
  } else {
    this.port = this.protocol === 'https' ? 443 : 80;
  }

  this.path = options.path || '';
  this.reqHeaders = options.reqHeaders || {};
  this.headers = options.headers || {};
  this.status = options.status;
  this.timeout = options.timeout || 30000;
  this.debug = options.debug || false;

  this.transport = this.protocol === 'https' ? https : http;
}

HttpClient.create = function(options) {
  return new HttpClient(options);
};

const methods = ['get', 'post', 'head', 'put', 'del', 'trace', 'options', 'connect'];

methods.forEach(function(method) {
  HttpClient.prototype[method] = function(assert, path, req, res, cb) {
    const self = this;

    // Validation
    if (typeof path !== 'string') {
      throw new TypeError('path must be a string');
    }

    // Gestion des signatures
    if (arguments.length === 3) {
      if (typeof req === 'function') {
        cb = req;
        req = {};
        res = {};
      } else {
        cb = null;
        res = req;
        req = {};
      }
    }

    if (arguments.length === 4) {
      if (typeof res === 'function') {
        cb = res;
        res = {};
      }
    }

    req = req || {};
    res = res || {};

    // Construction du path
    let fullPath = this.path + path;

    if (['post', 'put'].indexOf(method) === -1) {
      const data = req.data;
      if (data) {
        fullPath += '?' + querystring.stringify(data);
      }
    }

    const options = {
      host: this.host,
      port: this.port,
      path: fullPath,
      method: method === 'del' ? 'DELETE' : method.toUpperCase(),
      headers: Object.assign({}, this.reqHeaders, req.headers)
    };

    if (req.auth) {
      options.auth = req.auth;
    } else if (this.auth) {
      options.auth = this.auth;
    }

    const request = this.transport.request(options);

    // Timeout
    request.setTimeout(this.timeout, function() {
      request.abort();
    });

    // Gestion des erreurs
    request.on('error', function(err) {
      if (self.debug) {
        console.error('HTTP request error:', {
          message: err.message,
          code: err.code,
          host: options.host,
          port: options.port,
          path: options.path,
          method: options.method
        });
      }

      if (cb) {
        return cb(err);
      }

      if (assert && typeof assert.ok === 'function' && typeof assert.done === 'function') {
        assert.ok(false, 'HTTP request error: ' + err.message);
        return assert.done();
      }

      // Sinon, on log sans crasher
      console.error('HTTP request error (no handler):', err.message);
    });

    // Corps pour POST / PUT
    if (['post', 'put'].indexOf(method) !== -1) {
      const bodyData = req.data || req.body;

      if (bodyData) {
        if (typeof bodyData === 'object') {
          request.setHeader('content-type', 'application/json');
          request.write(JSON.stringify(bodyData));
        } else {
          request.write(bodyData);
        }
      }
    }

    // Envoi
    request.end();

    // Réponse
    request.on('response', function(response) {
      const contentType = response.headers['content-type'] || '';
      
      // Encoding UTF-8 seulement pour text/json
      if (contentType.indexOf('text') !== -1 || contentType.indexOf('json') !== -1) {
        response.setEncoding('utf8');
      }

      response.body = '';

      response.on('data', function(chunk) {
        response.body += chunk;
      });

      response.on('end', function() {
        // Parse JSON
        if (contentType.indexOf('application/json') !== -1 && response.body) {
          try {
            response.data = JSON.parse(response.body);
          } catch (e) {
            // JSON invalide
          }
        }

        // Tests automatiques
        if (assert) {
          const expectedStatus = res.status || self.status;
          if (expectedStatus) {
            assert.equal(response.statusCode, expectedStatus);
          }

          const expectedHeaders = Object.assign({}, self.headers, res.headers);
          for (const key in expectedHeaders) {
            assert.equal(response.headers[key], expectedHeaders[key]);
          }

          if (res.body !== undefined) {
            assert.equal(response.body, res.body);
          }

          if (res.data !== undefined) {
            assert.deepEqual(response.data, res.data);
          }
        }

        // Callback ou fin
        if (cb) {
          return cb(response);
        } else if (assert && typeof assert.done === 'function') {
          return assert.done();
        }
      });
    });
  };
});

module.exports = HttpClient;
