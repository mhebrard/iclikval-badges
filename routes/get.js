var express = require('express');
var router = express.Router();
var model = require('../model/model.js');

router.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

router.post('/badges',[require('../middlewares/authentify')],function(req,res) {
	console.log('SEND badges');
	res.writeHead(200, {
		'Content-Type': 'application/json',
		'Access-Control-Allow-Origin': '*'
	});
	res.end(JSON.stringify(model.badges));
});

router.post('/rewards',[require('../middlewares/authentify')],function(req,res){
	console.log('REQUEST rewards of',req.body.user);
	model.getRewards(req.body.user)
	.then(function(data) {
		console.log('SEND rewards');
		res.writeHead(200, {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*'
		});
		res.end(JSON.stringify(data));
	}, function(err){console.log(err);
	});
});

module.exports = router;