!(function() {
	
	var ick = { version: "1.1" };
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
			//console.log("iclikval",ick.version);
			//console.log("jQ",jQuery.fn.jquery);
			//console.log("bootstrap",$.fn.modal.Constructor.VERSION);
			//console.log("d3",d3.version);
			return Promise.all([initView(),getBadges(),getSvg()]);
		}).then(function(){ 
			return Promise.all([setView(),getRewards()]);
		}).then(function(){
			console.log("setBadges",badges);
		 	setBadges(); 
		}).catch(function(err) { setError(err); return Error("ick.load:",err); })
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

	function initView() {
		console.log("initView");
		//style
		d3.select("head").selectAll("#ick-css").data(["style"])
		.enter().append("style").attr("id","ick-css").text(
			"#ick-main .progress{position:relative;}\n"
			+"#ick-main .progress span{position:absolute;display:block;width:100%;color:black;}\n"
			+".ick-glyph .fg { fill: #000;} .ick-glyph .bg { fill: #fff;}\n"
		)
		//hidden div
		//d3.select("body").selectAll(".ick-hide").data(["tip"])
		//.enter().append("div").attr("id",function(d){return "ick-"+d;}).attr("class", "ick-hide");
		/*ok*/
		//main
		var div = d3.select(".ick-content").attr("id","ick-main")
		var nav = div.append("div").attr("class","clearfix").append("div").attr("class","ick-nav btn-group pull-right")
		.style("margin","5px")
		nav.selectAll("a").data(["Current","Medals","Milestones"])
		.enter().append("a")
			.attr("class","btn btn-default")
			.attr("href",function(d){ return "#ick-tab"+d; })
			.text(function(d){ return d; })
		var panes = div.append("div")
		
		//Current div
		var pan = panes.append("div").attr("id","ick-tabCurrent").attr("class","panel panel-default")
			pan.append("div").attr("class","panel-heading").text("Current Badge Collection")
			pan.append("div").attr("class","panel-body")

		//Medals div
		pan = panes.append("div").attr("id","ick-tabMedals").attr("class","panel panel-default")
		pan.append("div").attr("class","panel-heading").text("Medals Earned")
		pan.append("div").attr("class","panel-body")

		//Milestones div
		pan = panes.append("div").attr("id","ick-tabMilestones").attr("class","panel panel-default")
		pan.append("div").attr("class","panel-heading").text("Milestones Earned")
		pan.append("div").attr("class","panel-body")

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
		body.append("div").append("svg").attr("class","ick-glyph")
			.attr("width","100px").attr("height","100px")
			.style("margin","5px").append("use")
		var sub = body.append("div").style("display","flex")
			.style("flex-direction","column").style("flex-grow",1)
		var line = sub.append("div")
			line.append("label").html("Description:&nbsp;")
			line.append("span").attr("class","ick-legend")
		var line = sub.append("div")
		line.append("label").html("Badges Earned:&nbsp;")
		line.append("span").attr("class","ick-earned")

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
		line.append("svg").attr("class","ick-current")
			.attr("width","25px").attr("height","25px")
			.append("use")
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
	}

	function getBadges() {
		return new Promise(function(ful,rej) {
			d3.json(param.server+"/get/badges/")
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

	function getSvg() {
		return new Promise(function(ful,rej) {
			d3.text(param.server+"/get/glyphs/")
				.header("Content-Type", "application/json")
				.post(JSON.stringify({key:param.key,user:param.user}),function(err, data) {
					if(err){ rej(Error("Unable to get glyphs:",err)) }
					else {
						//hidden div
						d3.select("body").selectAll(".ick-hide").data(["glyphs"])
						.enter().append("div")//.style("display","none")
						.attr("id",function(d){return "ick-"+d;}).attr("class", "ick-hide");

						d3.select("#ick-glyphs").html(data)
						ful("Glyphs OK");
					}
				})
		})
	}					

	function getRewards() {
		return new Promise(function(ful,rej) {
			d3.json(param.server+"/get/rewards/")
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
		console.log("setView");		
		//Current div
		var cont = d3.select("#ick-tabCurrent").select(".panel-body")
			.append("div").style("display","flex").style("flex-wrap","wrap")
			.selectAll("div").data(badges)
		var enter = cont.enter().append("div")
			.attr("class",function(d){return "ick-b"+d.id;})
			.style("text-align","center").style("padding","0px 5px")
			.style("cursor","pointer")
			.on("click",function(d){ $(this).tooltip('hide'); updateModal(d);})
			.attr("data-toggle","modal").attr("data-target","#ick-info")
			.attr("title",function(d) {return d.legend;})
		enter.append("svg").attr("width","80px").attr("height","80px")
			.attr("class","ick-current ick-glyph")
			.append("use").attr("xlink:href",function(d){return "#"+d.id})
			.style("margin","5px")
		enter.append("div").attr("class","progress text-center")
			.style("width","100%")
			.append("div").attr("class","progress-bar progress-bar-info")
			.attr("aria-valuemin",0).attr("aria-valuemax",100).attr("aria-valuenow",0)
			.style("color","#000").style("width","0").append("span").text("0")

		//Medal div
		var cont = d3.select("#ick-tabMedals").select(".panel-body")
			.append("table").attr("class","table table-striped table-hover")
		var head = cont.append("thead").append("tr").attr()
			head.append("th").text("Badge Name")
			head.append("th").style("text-align","center").text("Medals Earned")
			head.append("th").style("text-align","right").text("Maximum Count")
			head.append("th").style("text-align","center").text("Date of Maximum Count")
		var body = cont.append("tbody").selectAll("tr")
			.data(badges.filter(function(d){return d.tier.length==3;}))
		var enter = body.enter().append("tr")
			.attr("class",function(d){return "ick-b"+d.id;})
			.style("cursor","pointer")
			.on("click",function(d){$(this).tooltip('hide'); updateModal(d);})
			.attr("data-toggle","modal")
			.attr("data-target","#ick-info")
			.attr("title",function(d) {return d.legend;})
			enter.append("td").text(function(d){return d.title;})
			enter.append("td").attr("class","ick-earned").style("display","flex")
			enter.append("td").attr("class","ick-highscore").style("text-align","right")
			enter.append("td").attr("class","ick-highitem").style("text-align","center")	
		
		//Milestones div
		var cont = d3.select("#ick-tabMilestones").select(".panel-body")
			.append("table").attr("class","table table-striped table-hover")
		var head = cont.append("thead").append("tr").attr()
			head.append("th").text("Badge Name")
			head.append("th").text("Milestones Earned")
			head.append("th").style("text-align","right").text("Maximum Count")
			head.append("th").style("text-align","right").text("Next Stone")
		var body = cont.append("tbody").selectAll("tr")
			.data(badges.filter(function(d){return d.tier.length>3;}))
		var enter = body.enter().append("tr")
			.attr("class",function(d){return "ick-b"+d.id;})
			.style("cursor","pointer")
			.on("click",function(d){$(this).tooltip('hide'); updateModal(d);})
			.attr("data-toggle","modal")
			.attr("data-target","#ick-info")
			.attr("title",function(d) {return d.legend;})
			enter.append("td").text(function(d){return d.title;})
			enter.append("td").attr("class","ick-earned")
			enter.append("td").attr("class","ick-highscore").style("text-align","right")
			enter.append("td").attr("class","ick-next").style("text-align","right")

		$(function() { $('[data-toggle="modal"]').tooltip(); });
		
		return Promise.resolve();
	}

	function updateModal(d) {
		var div = d3.select("#ick-info").datum(d);
		div.select(".modal-title").text(d.title)
		div.select(".ick-legend").text(d.legend)
		updateEarned(div,d);
		div.selectAll(".ick-highscore").text(f(d.highscore))
		div.select(".ick-highitem").text(d.highitem)
		div.select("span.ick-current").text(f(d.currentcount))
		div.select("svg.ick-current").attr("class", function() {
			var t=d.currenttier;
			while(t>10){t-=10;}
			return "ick-current ick-"+t;
		})
		div.select(".progress-bar").style("width",d.percent+"%")
			.attr("aria-valuemax",d.next).attr("aria-valuenow",f(d.currentcount))
			.select("span").text(f(d.currentcount))
		div.select(".ick-next").html(function(){return d.currentcount==d.next ? "-" : f(d.next)})
		//shape
		div.selectAll("svg").selectAll("use").attr("xlink:href","#"+d.id)
	}

	function updateEarned(div,d) {
		console.log("uE",div,d);
		var line=div.select(".ick-earned").html("");
		if(d.tier.length==3) {//medal
			line.append("span").style("flex-grow",1)
				.style("text-align","right").style("font-weight","bold")
				.html("&nbsp;"+d.count[1]+"x"+"&nbsp;")
			line.append("svg").attr("class","ick-b").style("flex-grow",0)
				.attr("width","25px").attr("height","25px")
				.append("use")
			
			line.append("span").style("flex-grow",1)
				.style("text-align","right").style("font-weight","bold")
				.html("&nbsp;"+d.count[2]+"x"+"&nbsp;")
			line.append("svg").attr("class","ick-s").style("flex-grow",0)
				.attr("width","25px").attr("height","25px")
				.append("use")

			line.append("span").style("flex-grow",1)
				.style("text-align","right").style("font-weight","bold")
				.html("&nbsp;"+d.count[3]+"x"+"&nbsp;")
			line.append("svg").attr("class","ick-g").style("flex-grow",0)
				.attr("width","25px").attr("height","25px")
				.append("use")
		}
		else {//milestone
			var t=d.currenttier;
			while(t>10){
				line.append("svg").attr("class","ick-11")
				.attr("width","25px").attr("height","25px")
				.append("use")
				t-=10;
			}
			//line.append("span").html("&nbsp;+&nbsp;")
			for(i=1;i<=t;i++){
				line.append("svg").attr("class","ick-"+i)
				.attr("width","25px").attr("height","25px")
				.append("use")
			}
			
		}
		//shape
		div.selectAll("svg").selectAll("use").attr("xlink:href","#"+d.id)
	}

	function getBadge(id) { //return the badge with id=id
		var obj = 0;
		for(var i=0;(obj==0 && i<badges.length);i++) {
			if(badges[i].id==id) {obj=badges[i];}
		}
		return obj;
	}

	function setBadges() {
		d3.selectAll("svg.ick-current").filter(function(d){return d && d.next;})
			.attr("class",function(d){ //stack the 10e stones
				var t=d.currenttier;
				while(t>10){t-=10;}
				return "ick-current ick-"+t;
			})

		d3.selectAll(".progress-bar").filter(function(d){return d && d.next;})
			.style("width",function(d){return d.percent+"%";})
			.attr("aria-valuemax",function(d){ return d.next;})
			.attr("aria-valuenow",function(d){ return d.currentcount;})
			.selectAll("span").text(function(d){ return f(d.currentcount);})

		//Earned
		d3.selectAll("tr").filter(function(d){return d && d.next;})
		.each(function(d) { updateEarned(d3.select(this),d); })
		
		d3.selectAll(".ick-highscore").filter(function(d){return d && d.next;})
			.text(function(d) {return f(d.highscore);})
		d3.selectAll(".ick-highitem").filter(function(d){return d && d.next;})
			.text(function(d) {return d.highitem;})
		d3.selectAll(".ick-next").filter(function(d){return d && d.next;})
			.html(function(d){return d.currentcount==d.next ? "-" : f(d.next)})
	}
	
	function setError(e) {
		var div = d3.select(".ick-content").attr("id","ick-main")
			.append("div").attr("class","alert alert-danger")
		div.append("span").attr("class","glyphicon glyphicon-exclamation-sign")
		div.append("span").text("Error: Cannot get data");
		console.log(e);
	}

	function f(i) { return Number(i).toLocaleString('en'); }

	//DEFINE OR EXPORTS//
	if (typeof define === "function" && define.amd) define(ick); else if (typeof module === "object" && module.exports) module.exports = ick;
	this.ick = ick;
	
}());
