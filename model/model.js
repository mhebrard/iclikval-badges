//require
var fs = require('fs');
var path = require('path');
var http = require('https');
var config = require('../config.json');
var badges = require('./badges.json');

//iclikval server
var url="api.iclikval.riken.jp";

module.exports.badges = badges;

module.exports.getRewards = function(user) {
	var rewards=[];
	var seq = Promise.resolve()
	.then(function(){ //query
		console.log("QUERY ANNOT of",user);
		var p={"group":["reviewer","year","month","day"],"filter":{"reviewer":user}};
		return query("/annotation-count",p,user);
	}).then(function(annots){
		return computeRewards(annots,rewards)})
	.then(function() { return rewards; })
	.catch(function(err) { return Error("server.model.getRewards:"+err)})

	return seq;
}

function computeRewards(annots,rws) {
	var seq = Promise.resolve();
	var fc,fh,fk,fd;
		seq = seq.then(function() { return computeWeek(annots.result); })
		.then(function(days) { //Compute day + group by weekend,week,month
			fc=function(d,b,date){ //is current day ?
				if(d.group.year==date.getFullYear()
					&& d.group.month==date.getMonth()+1
					&& d.group.day==date.getDate()) {
					return d.count;
				}
				else {return 0;}
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
				computeTier(rws,days,"annot-d",fc), //compute day
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
			var fcm=function(d,b,date){ //current month
				if(d.group.year==date.getFullYear()
					&& d.group.month==date.getMonth()+1) {
					return d.count;
				}
				else {return 0;}
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
				computeTier(rws,weeks[1],"annot-we",fc), //compute weekend
				computeTier(rws,weeks[2],"annot-w",fc), //compute week
				computeTier(rws,weeks[3],"annot-m",fcm), //compute month
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

			var sum=years[3].reduce(function(tot,d) { return tot+d.count;},0);

			return Promise.all([
				computeTier(rws,years[3],"annot-y",fc), //compute years
				computeStone(rws,sum,"annot-a") //compute all
			])
		})
		.catch(function(err) { return Error("server.model.computeRewards.years:"+err)})

	return seq;
}

function query (entry,p,user) {
 	return new Promise(function(ful,rej) {
		var data = JSON.stringify(p);
		var options = {
	    	hostname: url,
	    	path: entry,
	    	method: 'POST',
	   		headers: {
		   		'Content-Type': 'application/json',
		      'Accept': 'application/json',
		      'Content-Length': Buffer.byteLength(data)
		    }
		};
		var req = http.request(options, function(res) {
			// console.log('query', res);
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

function computeTier(rws,data,id,fc) {
	return new Promise(function(ful,rej) {
		var b = getBadge(id);
		var current=0,max={count:-1};//empty day
		var tier0=[],tier1=[],tier2=[],tier3=[];
		var date=new Date();

		//split by tier + sum + max + currentcount
		data.forEach(function(d){
			if(d.count>max.count) {max=d;}
			if(d.count<b.tier[0]) {tier0.push(d);}
			else if(d.count<b.tier[1]) {tier1.push(d);}
			else if(d.count<b.tier[2]) {tier2.push(d);}
			else {tier3.push(d);}
			current+=fc(d,b,date);
		})
		//current tier
		var tier,next;
		if(current<b.tier[0]) {tier=0;next=b.tier[0];}
		else if(current<b.tier[1]) {tier='b';next=b.tier[1];}
		else if(current<b.tier[2]) {tier='s';next=b.tier[2];}
		else {tier='g';next=current;}
		//insert
		rws.push({
			badgeid:b.id,
			count:[tier0.length,tier1.length,tier2.length,tier3.length],
			currenttier:tier,
			currentcount:current,
			next:next,
			percent:Math.round(current*100/next)
		});
		console.log("push reward",b.id);
		ful(max.count);
	}).then(function(mcount){ return computeStone(rws,mcount,id); })
}

function computeStone(rws,sum,id) {
	return new Promise(function(ful,rej) {
		var b = getBadge(id+"s");
		//current tier
		var tier,next;
		var found=false;
		for(var i=0;i<b.tier.length && !found;i++){
			if(sum<b.tier[i]) {
				tier=i;
				next=b.tier[i];
				found=true;
			}
		}
		//maximum tier
		if(!found) {tier=b.tier.length;next=sum;}

		//insert
		rws.push({
			badgeid:b.id,
			count:[],
			currenttier:tier,
			currentcount:sum,
			next:next,
			percent:Math.round(sum*100/next)
		});
		console.log("push reward",b.id);
		ful("Reward INSERTED");
	})
}

var monthShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fdate(y,m,d) {
	var str="";
	if(d){str+=d+" ";}
	if(m){str+=monthShort[m-1]+" ";}
	return str+=y;
}
