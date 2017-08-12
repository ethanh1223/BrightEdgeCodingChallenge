var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');

var data = require('./mockData.json');

var app = express()

app.use(express.static(path.join(__dirname,'public')))

app.use(bodyParser.json())

app.get('/data', function(req, res) {
  res.send(data)
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})