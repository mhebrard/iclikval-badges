!(function() {
	
	var ick = { version: "1.1" };
	var mode = "prod";
	var param = {};
	var badges;
		
	//METHODS//
	ick.load = function(server,key,user) {
		param.server=server;
		param.key=key;
		param.user=user;
		var scripts = [];
		//verif dependencies
		if (!window.jQuery) { //include jQ + bootstrap
			scripts.push(scriptload("http://code.jquery.com/jquery-1.12.0.min.js")); 
			scripts.push(linkload("https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css"));
			scripts.push(linkload("https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap-theme.min.css"));
			scripts.push(scriptload("https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js"));
		}
		else if (!$.fn.modal.Constructor.VERSION) { //include bootstrap
			scripts.push(linkload("https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css"));
			scripts.push(linkload("https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap-theme.min.css"));
			scripts.push(scriptload("https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js")); 
		}
		if(!window.d3) {scripts.push(scriptload("http://d3js.org/d3.v3.min.js")); } //include d3

		Promise.resolve()
		.then(function(){ return Promise.all(scripts);}) //run loading
		.catch(function(err){return console.log("ERR(ick.load.a):"+err);})
		.then(function(){ 
//			console.log("iclikval",ick.version);
//			console.log("jQ",jQuery.fn.jquery);
//			console.log("bootstrap",$.fn.modal.Constructor.VERSION);
//			console.log("d3",d3.version);
			return getBadges();
		}).then(function(){ 
			return Promise.all([setView(),getRewards()]);
			//setView(); return getRewards(); 
		})
		.then(function(){
			console.log("setBadges",badges);
		 setBadges(); })
		.catch(function(err) { setError(err); return Error("ick.load:",err); })
	}

	function scriptload(u) {
		return new Promise(function(ful) {
			var s = document.createElement('script');
			s.type = 'text/javascript';
			s.src = u;
			s.onload = function(){ return ful(u+" loaded");}
			document.getElementsByTagName('head')[0].appendChild(s);
		});
	}

	function linkload(u) {
		return new Promise(function(ful) {
			var s = document.createElement('link');
			s.rel = 'stylesheet';
			s.href = u;
			s.crossorigin = "anonymous";
			s.onload = function(){ return ful(u+" loaded");};
			document.getElementsByTagName('head')[0].appendChild(s);
		});
	}

	function getBadges() {
		return new Promise(function(ful,rej) {
			d3.json(param.server+"/getbadges/")
				.header("Content-Type", "application/json")
				.post(JSON.stringify({key:param.key,user:param.user}),function(err, data) {
					if(err){ rej(Error("Unable to get badges:",err)) }
					else {
						badges=data;
						console.log("getBadges",badges);
						ful("Badges OK");
					}
				})
		})
	}			

	function getRewards() {
		return new Promise(function(ful,rej) {
			d3.json(param.server+"/getrewards/")
				.header("Content-Type", "application/json")
				.post(JSON.stringify({key:param.key,user:param.user}),function(err, data) {
					if(err){ rej(Error("Unable to get rewards:",err)) }
					else {
						console.log("getRewards",data);
						//merge rewards and badges
						data.forEach(function(rw) {
							var b = getBadge(rw.badgeid);
							//map all properties
							Object.keys(rw).forEach(function(k){
								b[k]=rw[k];
							})
							//delete dupl
							delete b.badgeid;
						})
						ful("Rewards OK");
					}
				});
		});
	}

	function setView() {
		console.log("initView");
		//style
		d3.select("head").selectAll("#ick-css").data(["style"])
		.enter().append("style").attr("id","ick-css").text(
			"#ick-main .progress{position:relative;}\n"
			+"#ick-main .progress span{position:absolute;display:block;width:100%;color:black;}\n"
		);
		//hidden div
		//d3.select("body").selectAll(".ick-hide").data(["tip"])
		//.enter().append("div").attr("id",function(d){return "ick-"+d;}).attr("class", "ick-hide");
		/*ok*/
		//main
		var div = d3.select(".ick-content").attr("id","ick-main")
		var nav = div.append("div").attr("class","clearfix").append("div").attr("class","ick-nav btn-group pull-right")
		.style("margin","5px")
		nav.selectAll("a").data(["Current","Medals"])
		.enter().append("a")
			//.append("a")
			.attr("class","btn btn-default")
			.attr("href",function(d){ return "#ick-tab"+d; })
			//.attr("data-toggle","pill")
			.text(function(d){ return d; })
		var panes = div.append("div")
		
		//Current div
		var cur = panes.append("div").attr("id","ick-tabCurrent").attr("class","panel panel-default")
			cur.append("div").attr("class","panel-heading").text("Current Badge Collection")
		var cont=cur.append("div").attr("class","panel-body")
			.append("div").style("display","flex").style("flex-wrap","wrap")
			.selectAll("div").data(badges)
		var enter = cont.enter().append("div")
			.attr("class",function(d){return "ick-b"+d.id;})
			.style("text-align","center").style("padding","0px 5px")
			.style("cursor","pointer")
			.on("click",function(d){ $(this).tooltip('hide'); updateModal(d);})
			.attr("data-toggle","modal").attr("data-target","#ick-info")
			.attr("title",function(d) {return d.legend;})
		enter.append("img").attr("class","ick-current")
			.attr("alt",function(d){return d.id;})
			.attr("src",function(d){return param.server+"/img/"+d.id+".svg";})
			.attr("width","80px").attr("height","80px")
			.style("margin","5px")
		enter.append("div").attr("class","progress text-center")
			.style("width","100%")
			.append("div").attr("class","progress-bar progress-bar-info")
			.attr("aria-valuemin",0).attr("aria-valuemax",100).attr("aria-valuenow",0)
			.style("color","#000").style("width","0").append("span").text("0")

		//Medal div
		var medals = panes.append("div").attr("id","ick-tabMedals").attr("class","panel panel-default")
			medals.append("div").attr("class","panel-heading").text("Medals Earned")
			//.append("h1").attr("class","panel-heading")
		var cont=medals.append("div").attr("class","panel-body")
			.append("table").attr("class","table table-striped table-hover")
		var head = cont.append("thead").append("tr").attr()
			head.append("th").text("Badge")
			head.append("th").attr("colspan","3").style("text-align","center").text("Bronze")
			head.append("th").attr("class","col-md-1")
			head.append("th").attr("colspan","3").style("text-align","center").text("Silver")
			head.append("th").attr("class","col-md-1")
			head.append("th").attr("colspan","3").style("text-align","center").text("Gold")
			head.append("th").style("text-align","right").text("Maximum Count")
			head.append("th").style("text-align","center").text("Date of Maximum Count")
		var body = cont.append("tbody").selectAll("tr").data(badges)
		var enter = body.enter().append("tr")
			.attr("class",function(d){return "ick-b"+d.id;})
			.style("cursor","pointer")
			.on("click",function(d){$(this).tooltip('hide'); updateModal(d);})
			.attr("data-toggle","modal")
			.attr("data-target","#ick-info")
			.attr("title",function(d) {return d.legend;})
			enter.append("td").text(function(d){return d.title;})
			enter.append("td").append("img").attr("alt",function(d){return d.id;})
			.attr("src",function(d){return param.server+"/img/"+d.id+"-1.svg";})
			.attr("width","25px").attr("height","25px")
			enter.append("td").text("x")
			enter.append("td").attr("class","ick-nb1").style("text-align","right")
			enter.append("td")
			enter.append("td").append("img").attr("alt",function(d){return d.id;})
			.attr("src",function(d){return param.server+"/img/"+d.id+"-2.svg";})
			.attr("width","25px").attr("height","25px")
			enter.append("td").text("x")
			enter.append("td").attr("class","ick-nb2").style("text-align","right")
			enter.append("td")
			enter.append("td").append("img").attr("alt",function(d){return d.id;})
			.attr("src",function(d){return param.server+"/img/"+d.id+"-3.svg";})
			.attr("width","25px").attr("height","25px")
			enter.append("td").text("x")
			enter.append("td").attr("class","ick-nb3").style("text-align","right")
			enter.append("td").attr("class","ick-highscore").style("text-align","right")
			enter.append("td").attr("class","ick-highitem").style("text-align","center")	
		
		//Modal
		var modal = div.append("div").attr("id","ick-info")
			.attr("class","modal fade")
			.append("div").attr("class","modal-dialog")
			.append("div").attr("class","modal-content")
		var head = modal.append("div").attr("class","modal-header")
		head.append("button").attr("class","close")
			.attr("type","button").attr("data-dismiss","modal")
			.append("span").html("&times;")
        head.append("h4").attr("class","modal-title")
		var body = modal.append("div").attr("class","modal-body")
			.style("display","flex")
		body.append("div").append("img").style("margin","5px")
		var sub = body.append("div").style("display","flex")
			.style("flex-direction","column").style("flex-grow",1)
		var line = sub.append("div")
			line.append("label").html("Description:&nbsp;")
			line.append("span").attr("class","ick-legend")
		var line = sub.append("div")
		line.append("label").html("Medals Earned:&nbsp;")
		line.append("img").attr("class","ick-nb1")
			.attr("width","25px").attr("height","25px")
		line.append("span").attr("class","ick-nb1")
		line.append("img").attr("class","ick-nb2")
			.attr("width","25px").attr("height","25px")
		line.append("span").attr("class","ick-nb2")
		line.append("img").attr("class","ick-nb3")
			.attr("width","25px").attr("height","25px")
		line.append("span").attr("class","ick-nb3")
		line = sub.append("div")
		line.append("label").html("Maximum Count:&nbsp")
		line.append("span").attr("class","ick-highscore")
		line.append("label").html("&nbspDate:&nbsp")
		line.append("span").attr("class","ick-highitem")
		
		line = sub.append("div")
		line.append("label").html("Current Count:&nbsp")
		line.append("span").attr("class","ick-current")
		line.append("label").html("&nbspNext Medal at:&nbsp")
		line.append("span").attr("class","ick-next")
		
		line = sub.append("div").style("display","flex")
		line.append("img").attr("class","ick-current")
			.attr("width","25px").attr("height","25px")
		line.append("div").attr("class","progress").style("width","100%")
			.append("div").attr("class","progress-bar progress-bar-info")
			.attr("aria-valuemin",0).attr("aria-valuemax",100).attr("aria-valuenow",0)
			.style("width","0").append("span")
		
		//modif scroll according to iclikval top menu
		var offset = 50;
		$('.ick-nav a').click(function(event) {
		    event.preventDefault();
		    $($(this).attr('href'))[0].scrollIntoView();
		    scrollBy(0, -offset);
		});
		
		//active
		//nav.select("li").classed("active",true);
		//panes.select("div").classed("active",true);
		//$('[data-toggle="modal"]').tooltip();
		$(function() {
   			$('[data-toggle="modal"]').tooltip();
		});
		return Promise.resolve();
	}

	function updateModal(d) {
		var div = d3.select("#ick-info").datum(d);
		div.select(".modal-title").text(d.title)
		div.select("img").attr("src",param.server+"/img/"+d.id+".svg")
		div.select(".ick-legend").text(d.legend)
		div.select("img.ick-nb1").attr("src",param.server+"/img/"+d.id+"-1.svg")
		div.select("span.ick-nb1").html("x"+d.count1+"&nbsp;")
		div.select("img.ick-nb2").attr("src",param.server+"/img/"+d.id+"-2.svg")
		div.select("span.ick-nb2").html("x"+d.count2+"&nbsp;")
		div.select("img.ick-nb3").attr("src",param.server+"/img/"+d.id+"-3.svg")
		div.select("span.ick-nb3").html("x"+d.count3+"&nbsp;")
		div.selectAll(".ick-highscore").text(f(d.highscore))
		div.select(".ick-highitem").text(d.highitem)
		div.select("img.ick-current").attr("src",param.server+"/img/"+d.id+"-"+d.currenttier+".svg")
		div.select("span.ick-current").text(function(d){return f(d.currentcount)})
		div.select(".progress-bar").style("width",d.percent+"%")
			.attr("aria-valuemax",d.next).attr("aria-valuenow",f(d.currentcount))
			.select("span").text(f(d.currentcount))
		div.select(".ick-next").html(function(){return d.currentcount==d.next ? "-" : f(d.next)})
	}

	function getBadge(id) { //return the badge with id=id
		var obj = 0;
		for(var i=0;(obj==0 && i<badges.length);i++) {
			if(badges[i].id==id) {obj=badges[i];}
		}
		return obj;
	}

	function setBadges() {
		d3.selectAll("img.ick-current").filter(function(d){return d && d.next;})
			.attr("src",function(d){ return param.server+"/img/"+d.id+"-"+d.currenttier+".svg";})
		d3.selectAll(".progress-bar").filter(function(d){return d && d.next;})
			.style("width",function(d){return d.percent+"%";})
			.attr("aria-valuemax",function(d){ return d.next;})
			.attr("aria-valuenow",function(d){ return d.currentcount;})
			.selectAll("span").text(function(d){ return f(d.currentcount);})
		d3.selectAll(".ick-nb1").filter(function(d){return d && d.next;})
			.text(function(d) {return d.count1;})
		d3.selectAll(".ick-nb2").filter(function(d){return d && d.next;})
			.text(function(d) {return d.count2;})
		d3.selectAll(".ick-nb3").filter(function(d){return d && d.next;})
			.text(function(d) {return d.count3;})
		d3.selectAll(".ick-highscore").filter(function(d){return d && d.next;})
			.text(function(d) {return f(d.highscore);})
		d3.selectAll(".ick-highitem").filter(function(d){return d && d.next;})
			.text(function(d) {return d.highitem;})
	}
	
	function setError(e) {
		var div = d3.select(".ick-content").attr("id","ick-main")
			.append("div").attr("class","alert alert-danger")
		div.append("span").attr("class","glyphicon glyphicon-exclamation-sign")
		div.append("span").text("Error: Cannot get data");
		console.log(e);
			/*<div class="alert alert-danger" role="alert">
  <span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>
  <span class="sr-only">Error:</span>
  Enter a valid email address
</div>*/
	}

	function f(i) { return Number(i).toLocaleString('en'); }

	//DEFINE OR EXPORTS//
	if (typeof define === "function" && define.amd) define(ick); else if (typeof module === "object" && module.exports) module.exports = ick;
	this.ick = ick;
	
}());
