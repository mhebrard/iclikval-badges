var express = require('express');
var fs = require('fs');
var path = require('path');
var router = express.Router();
var badges = require('../model/badges.json');

router.get('/',function(req,res) {
	console.log('INFO');
	var glyphs;
	var p = path.join(__dirname,'..','public','img','glyphs.svg');
	var filename = require.resolve(p);
	
    fs.readFile(filename, 'utf8', function (err, words) {
		glyphs=words;

   		res.render('list', { title: 'Test', badges: badges, glyphs:glyphs});
   	});
});

module.exports = router;