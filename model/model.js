//require
var fs = require('fs');
var path = require('path');
var sql = require('sqlite3').verbose();
var http = require('http');

//Define Database
var file = 'rewards.db';
var exists = fs.existsSync(file);
var db = new sql.Database(file);

//iclikval server
var url="api.iclikval.riken.jp";
var badges;

//Init db
module.exports.init = function() {
	//if not exist create database
	db.serialize(function() {
  		if(!exists) {
  			//create table
    		db.run("CREATE TABLE if not exists user ("
    			+"username TEXT PRIMARY KEY NOT NULL,"
    			+"hasnewannotation INTEGER"
    			+")"
    		);
    		db.run("CREATE TABLE if not exists reward ("
    			+"username TEXT,"
    			+"badgeid TEXT,"
    			+"count1 INTEGER,"
    			+"count2 INTEGER,"
    			+"count3 INTEGER,"
    			+"highscore INTEGER,"
    			+"highitem TEXT,"
    			+"currenttier INTEGER,"
    			+"currentcount INTEGER,"
    			+"next INTEGER,"
    			+"percent INTEGER,"
    			+"PRIMARY KEY(username,badgeid),"
    			+"FOREIGN KEY(username) REFERENCES user(username)"
    			+")"
    		);
    		db.each("SELECT name FROM sqlite_master WHERE type='table'", function (err, table) {
    			console.log("Tables created: "+ table.name);
   			});

   		}//end if not exist
	});//end serialize

//	db.close();
}

module.exports.getBadges = function() {
	return new Promise(function(ful,rej) {
		console.log("READ badges");
		fs.readFile(path.join(__dirname, "badges.json"), function(err, data){
			if(err) { rej(Error("server.model.getBadges:"+err)); }
			else {
				badges=JSON.parse(data);
				ful(badges);
			}
		});
	});
}

module.exports.getRewards = function(user) {
	return new Promise(function(ful,rej) {
		selectUser(user)
		.then(function(u) { return computeRewards(u); })
		.then(function(u) { return ful(u); })
		.catch(function(err) { return Error("server.model.getRewards:"+err)})
	})
}

function selectUser(user) {
	return new Promise(function(ful,rej) {
		console.log("SELECT user",user);
		//select user
		db.all("SELECT * FROM user WHERE username='"+user+"'", function(err, u) {
			if(err) {rej(Error("server.model.selectUser.select:"+err));}
			if(u.length==0) {// add user to reward db
				console.log("INSERT",user);
				u=[{username:user,hasnewannotation:1}];
				db.run("INSERT INTO user VALUES (?,?)",[user,1],function(err,r) {
					if(err) {rej(Error("server.model.selectUser.insert:"+err));}
					ful(u[0]);
				});
			}
			else {ful(u[0]);}	
		})		
	})
}

function computeRewards(u) {
	var seq = Promise.resolve();
	var fc,fh,fk,fd;
	if (u.hasnewannotation==1) { //update user's badges
		//get iclikval API token
		seq = seq.then(function(){
			console.log("get token for iclikval API");
			return getToken();
		}).then(function(token) {
			console.log("QUERY ANNOT of",u.username);
			var p={"group":["reviewer","year","month","day"],"filter":{"reviewer":u.username}};
			return query("/annotation-count",p,u.username,token); 
		})
		.then(function(data) {
			return computeWeek(data.result); })
		.then(function(days) { //Compute day + group by weekend,week,month
			fc=function(d,b,date){ //is current day ?
				if(d.group.year==date.getFullYear() 
					&& d.group.month==date.getMonth()+1 
					&& d.group.day==date.getDate()) {
					return d.count;
				}
				else {return 0;}
			}
			fh=function(d) { //high day display
				return fdate(d.group.year,d.group.month,d.group.day);
			}
			fk=function(d) { //key for week
				return d.group.year+"-"+d.group.week;
			} 
			fd=function(d) { //week node
				var date = new Date(d.group.year,d.group.month-1,d.group.day);
				var n = JSON.parse(JSON.stringify(d));
				//get Monday
				var day = date.getDay()!=0?date.getDay():7;
				var mon = new Date(date.setTime( date.getTime() - (day-1) * 86400000 ));
				n.group.day = mon.getDate();
				n.group.month = mon.getMonth()+1;
				n.group.year = mon.getFullYear();
				//delete n.group.week; 
				delete n.group.weekend;
				return n;
			}
			var fkm=function(d) { //key for month
				return d.group.year+"-"+d.group.month;
			}
			var fdm=function(d) { //month node
				var n = JSON.parse(JSON.stringify(d));
				n.group.day = 1; //1st
				delete n.group.week; delete n.group.weekend;
				return n;
			}

			return Promise.all([
				computeTier(u.username,days,getBadge("annot-d"),fc,fh), //compute day
				groupBy(days.filter(function(d){return d.group.weekend==1;}),fk,fd), //group by weekend
				groupBy(days,fk,fd), //group by week
				groupBy(days,fkm,fdm)//group by month
			])
		})
		.catch(function(err) { return Error("server.model.computeRewards.days:"+err)})
		.then(function(weeks) { //Compute weekend,week,month + group by year
			fc=function(d,b,date){ //current week
				if(d.group.year==date.getFullYear() 
					&& d.group.week==getWeek(date)) {
					return d.count;
				}
				else {return 0;}
			}
			fh=function(d) { //high week display
				var date = new Date(d.group.year,d.group.month-1,d.group.day);
				var mon = new Date(d.group.year,d.group.month-1,d.group.day);
				var sun = new Date(date.setTime( date.getTime() + 6 * 86400000 ));
				return fdate(mon.getFullYear(),mon.getMonth()+1,mon.getDate())+" to "+fdate(sun.getFullYear(),sun.getMonth()+1,sun.getDate())
			}
			var fhwe=function(d) { //high weekend display
				var date = new Date(d.group.year,d.group.month-1,d.group.day);
				var sat = new Date(date.setTime( date.getTime() + 5 * 86400000 ));
				var sun = new Date(date.setTime( date.getTime() + 1 * 86400000 ));
				return fdate(sat.getFullYear(),sat.getMonth()+1,sat.getDate())+" to "+fdate(sun.getFullYear(),sun.getMonth()+1,sun.getDate())
			}
			var fcm=function(d,b,date){ //current month
				if(d.group.year==date.getFullYear() 
					&& d.group.month==date.getMonth()+1) {
					return d.count;
				}
				else {return 0;}
			}
			var fhm=function(d) { //high month display
				return fdate(d.group.year,d.group.month);
			}
			fk=function(d) { //key for year
				return d.group.year;
			}
			fd=function(d) { //year node
				var n = JSON.parse(JSON.stringify(d));
				n.group.month = 1; //Jan.
				return n;
			}

			return Promise.all([
				computeTier(u.username,weeks[1],getBadge("annot-we"),fc,fhwe), //compute weekend
				computeTier(u.username,weeks[2],getBadge("annot-w"),fc,fh), //compute week
				computeTier(u.username,weeks[3],getBadge("annot-m"),fcm,fhm), //compute month
				groupBy(weeks[3],fk,fd) //group by year
			])
		})
		.catch(function(err) { return Error("server.model.computeRewards.weeks:"+err)})
		.then(function(years) { //compute year
			fc=function(d,b,date){ //current year
				if(d.group.year==date.getFullYear()) {
					return d.count;
				}
				else {return 0;}
			}
			fh = function(d) { //high year display
				return fdate(d.group.year);
			}

			return computeTier(u.username,years[3],getBadge("annot-y"),fc,fh);
		})
		.catch(function(err) { return Error("server.model.computeRewards.years:"+err)})
	}
	
	//Select Rewards
	seq = seq.then(function(){
		//	return {test:"STOP",func:"computeRewards",data:years};
		return selectRewards(u.username);
	})

	return seq;
}

function query (entry,p,user,token) {
 	return new Promise(function(ful,rej) {
		var data = JSON.stringify(p);
		var options = {
	    	host: url,
	   		port: 80,
	    	path: entry,
	    	method: 'POST',
	   		headers: {
		   		'Authorization': 'Bearer '+token,
		        'Content-Type': 'application/json',
		        'Accept': 'application/json',
		        'Content-Length': Buffer.byteLength(data)
		    }
		};
		var req = http.request(options, function(res) {
			var body="";
		  	res.setEncoding('utf8');
		  	res.on('data', function (chunk) { body+=chunk; });
		 	res.on('end', function () {
		 		try{ ful(JSON.parse(body)); }
		 		catch(err) {rej(Error("server.model.query",err))}
		 	});
	  	});
   		req.onerror = function() { rej(Error("server.model.query")); };
    	// run request
		req.write(data);
		req.end();
 	})
 }
 
function getToken() {
	return new Promise(function(ful,rej) {
		fs.readFile(path.join(__dirname, "..","middlewares","auth.json"), function(err, data){
			if(err) { rej(Error("server.model.getToken:"+err)); }
			else { ful(JSON.parse(data).token);}
		});
	});
}

function computeWeek(data) { //return array of days
	return new Promise(function(ful,rej) {
		ful(data.map(function(d){ 
			var date = new Date(d.group.year,d.group.month-1,d.group.day);
			//manages days before week 1
			var w = getWeek(date);
			d.group.week = (w>51 && date.getMonth()==11) ? 0 : w;
			d.group.weekend = (date.getDay()==0 || date.getDay()==6) ? 1 : 0;
			return d;
		}))//end map + ful
	})//end promise
}

function getWeek(date) { // Source: http://weeknumber.net/how-to/javascript
	var date = new Date(date.getTime());
	date.setHours(0, 0, 0, 0);
	date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
	var week1 = new Date(date.getFullYear(), 0, 4);
	return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000
        - 3 + (week1.getDay() + 6) % 7) / 7);
}

function getBadge(id) { //return the badge with id=id
	var obj = 0;
	for(var i=0;(obj==0 && i<badges.length);i++) {
		if(badges[i].id==id) {obj=badges[i];}
	}
	return obj;
}

function groupBy(data,fk,fd) {
	return new Promise(function(ful,rej) {
		var keys=[],count=[],res=[];
		data.forEach(function(d){
			var k=fk(d);
			var idx=keys.indexOf(k);
			if(idx<0) {
				idx=keys.length;
				keys[idx]=k;
				res[idx]=fd(d);
			}
			else {res[idx].count+=d.count;}
		})
		ful(res);
	})
}

function computeTier(user,data,b,fc,fh) {
	return new Promise(function(ful,rej) {
		var sum=0,nb=0,current=0,max={count:-1};//empty day
		var tier0=[],tier1=[],tier2=[],tier3=[];
		var date=new Date();

		//split by tier + sum + max + currentcount
		data.forEach(function(d){
			sum+=d.count;
			nb+=1;
			if(d.count>max.count) {max=d;}
			if(d.count<b.tier1) {tier0.push(d);}
			else if(d.count<b.tier2) {tier1.push(d);}
			else if(d.count<b.tier3) {tier2.push(d);}
			else {tier3.push(d);}
			current+=fc(d,b,date);
		})
		//current tier
		var tier,next;
		if(current<b.tier1) {tier=0;next=b.tier1;}
		else if(current<b.tier2) {tier=1;next=b.tier2;}
		else if(current<b.tier3) {tier=2;next=b.tier3;}
		else {tier=3;next=current;}
		//insert
		var insert = [user,b.id,tier1.length,tier2.length,tier3.length,max.count,fh(max),tier,current,next,Math.round(current*100/next)];
		console.log("INSERT badge [",user,b.id,"... ]");
		db.run("INSERT OR REPLACE INTO reward VALUES (?,?,?,?,?,?,?,?,?,?,?)",insert,function(err,r){
			if(err) {rej(Error("server.model.computeTier:"+err));}
			ful("Reward INSERTED");
		});
	})
}

function selectRewards(user){
	return new Promise(function(ful,rej) {
		console.log("SELECT rewards of",user);
		//select user
		db.all("SELECT * FROM reward WHERE username='"+user+"'", function(err, r) {
			if(err) {rej(Error("server.model.selectRewards:"+err));}
			ful(r);
		})		
	})
}

var monthShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fdate(y,m,d) {
	var str="";
	if(d){str+=d+" ";}
	if(m){str+=monthShort[m-1]+" ";}
	return str+=y;
}
