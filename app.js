//require
var express = require('express');
var fs = require('fs')
var path = require('path');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var model = require('./model/model.js');
var config = require('./config.json');

//init app
var app = express();
var port = process.env.PORT ||  config.port;
// create a write stream for log
var accessLogStream = fs.createWriteStream(path.join(__dirname,'access.log'), {flags: 'a'});

//config app
app.set('view engine', 'jade'); 
app.set('views', path.join(__dirname, 'views'));

//use middleware
app.use(express.static( path.join(__dirname,'public') ));
//app.use(bodyParser.urlencoded({ extended: true })); //form parser
app.use(bodyParser.json())
app.use(morgan('combined', {stream: accessLogStream})) //setup the logger

//define routes
//Open access routes
app.get('/',function(req,res) {
	console.log('HOME');
	res.writeHead(200, {'Content-Type': 'text/plain'});
	res.end('Node server Hello World\n');
});

app.get('/rewards',function(req,res) {
	console.log('REWARDS')
	model.getBadges().then(function(data) {
		res.render('rewards',{title:"Rewards list",data:data})
	})
})

//allow CORS
app.all('/get*',function(req,res,next) {
	res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

//restricted routes
app.post('/getbadges',[require('./middlewares/authentify')],function(req,res) {
	console.log('REQUEST badges');
	model.getBadges()
	.then(function(data) {
		console.log('SEND badges');
		res.writeHead(200, {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*'
		});
		res.end(JSON.stringify(data));
	}, function(err){console.log(err);
	});
});

app.post('/getrewards',[require('./middlewares/authentify')],function(req,res){
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

//listen
app.listen(port, function() {
	model.init();
	console.log('Server running on',port);
})