!(function() {

	var ick = { version: "1.2.1" };
	var param = {};
	var badges;

	//METHODS//
	//Load//
	ick.load = function(server,key,user) {
		param.server=server;
		param.key=key;
		param.user=user;
		var queue = [];
		//verif dependencies
		Promise.resolve().then(function(){
			if (!window.jQuery) { //no jQuery
				return scriptload("http://code.jquery.com/jquery-1.12.0.min.js");
			}
			else { return Promise.resolve() }
		}).catch(function(err){setError(err,"danger","ick.load.jQuery: jQuery is in trouble");})
		.then(function(){ //incude Bootstrap + D3
			if(!$.fn.modal || !$.fn.modal.Constructor.VERSION) {
				queue.push(linkload("https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css"));
				queue.push(scriptload("https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js"));
			}
			if(!window.d3) {queue.push(scriptload("https://d3js.org/d3.v3.min.js")); } //include d3
			return Promise.all(queue);
		}).catch(function(err){setError(err,"danger","ick.load.bootstrap: bootstrap is in trouble");})
		.then(function(){
			//console.log("iclikval",ick.version);
			//console.log("jQ",jQuery.fn.jquery);
			//console.log("bootstrap",$.fn.modal.Constructor.VERSION);
			//console.log("d3",d3.version);
			return Promise.all([initView(),getBadges(),getSvg()]);
		}).catch(function(err){setError(err,"danger","ick.load.getBadges: cannot get Badges data");})
		.then(function(){
			return Promise.all([setView(),getRewards()]);
		}).catch(function(err){setError(err,"warning","ick.load.getRewards: cannot get Rewards data");})
		.then(function(){
			console.log("setBadges",badges);
		 	setBadges();
		}).catch(function(err) { setError(err,"warning","ick.load.setBadges: cannot display Badges info");})
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

	//query
	function getBadges() {
		return new Promise(function(ful,rej) {
			d3.json(param.server+"/get/badges/")
				.header("Content-Type", "application/json")
				.post(JSON.stringify({key:param.key,user:param.user}),function(err, data) {
					if(err){ rej(new Error("Unable to get badges:",err)) }
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
					if(err){ rej(new Error("Unable to get glyphs:",err)) }
					else {
						//hidden div
						d3.select("body").selectAll(".ick-hide").data(["glyphs","tip"])
						.enter().append("div")
						.attr("id",function(d){return "ick-"+d;}).attr("class", "ick-hide");

						d3.select("#ick-glyphs").html(data)
						d3.select("#ick-tip").style("opacity",0)
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
					if(err){ rej(new Error("Unable to get rewards:",err)) }
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

	//View
	function initView() {
		console.log("initView");
		//style
		d3.select("head").selectAll("#ick-css").data(["style"])
		.enter().append("style").attr("id","ick-css").text(
			"#ick-main .progress{position:relative; margin-bottom:0px;}\n"
			+"#ick-main .progress span{position:absolute;display:block;width:100%;color:black;}\n"
			+"#ick-tip{position:absolute;z-index:3;color:#fff;background-color:#000;border:1px solid #000;border-radius:.2em;padding:3px;white-space:nowrap;font-size:14px;pointer-events:none;opacity:0}\n"

		)

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
		pan.append("div").attr("class","panel-heading").text("Medals")
		pan.append("div").attr("class","panel-body")

		//Milestones div
		pan = panes.append("div").attr("id","ick-tabMilestones").attr("class","panel panel-default")
		pan.append("div").attr("class","panel-heading").text("Milestones")
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
		body.append("div").append("svg")
			.attr("width","100px").attr("height","100px")
			.style("margin","5px").append("use").attr("class","ick-glyph")
		var sub = body.append("div").style("display","flex")
			.style("flex-direction","column").style("flex-grow",1)
		var line = sub.append("div")
			line.append("label").html("Description:&nbsp;")
			line.append("span").attr("class","ick-legend")
		line = sub.append("div")
		line.append("label").html("Badges Earned:&nbsp;")
		line.append("span").attr("class","ick-bronze")
		line.append("span").attr("class","ick-silver")
		line.append("span").attr("class","ick-gold")

		line = sub.append("div")
		line.append("label").html("Current Count:&nbsp")
		line.append("span").attr("class","ick-current")
		line.append("label").html("&nbspNext Badge at:&nbsp")
		line.append("span").attr("class","ick-next")

		line = sub.append("div").attr("class","ick-progress")

		//modif scroll according to iclikval top menu
		var offset = 50;
		$('.ick-nav a').click(function(event) {
		    event.preventDefault();
		    $($(this).attr('href'))[0].scrollIntoView();
		    scrollBy(0, -offset);
		});
	}

	function setView() {
		console.log("setView");
		//Current div
		var cont = d3.select("#ick-tabCurrent").select(".panel-body")
			.append("div").attr("class","ick-panel")
			.style("display","flex").style("flex-wrap","wrap")
			.selectAll("div").data(badges)
		var enter = cont.enter().append("div")
			.attr("class",function(d){return "ick-b"+d.id;})
			.style("text-align","center").style("padding","10px 5px")
			.style("cursor","pointer")
			.attr("data-toggle","modal").attr("data-target","#ick-info")
			.on("click",function(d){tip("hide",d); updateModal(d);})
			.on('mouseover', function(d){ tip("show",d); })
			.on('mouseout', function(d){ tip("hide",d); })
			.on("mousemove", function(d) { tip("move"); })
		enter.append("svg").attr("width","80px").attr("height","80px")
			.attr("class","ick-current")
			.append("use").attr("class","ick-glyph")
			.attr("xlink:href",function(d){return "#"+d.id})
			.style("margin","5px")
		enter.append("div").attr("class","ick-progress")
		enter.append("div").style("font-weight","bold").style("text-align","center")
			.style("width","80px").text(function(d){return d.title;})

		//Medal div
		var cont = d3.select("#ick-tabMedals").select(".panel-body")
			.append("table").attr("class","table table-striped table-hover ick-panel")
		var head = cont.append("thead").append("tr").attr()
			head.append("th").style("text-align","left").text("Badge Name")
			head.append("th").style("text-align","right").text("Bronze")
			head.append("th").style("text-align","right").text("Silver")
			head.append("th").style("text-align","right").text("Gold")
			head.append("th").text("")
/*		var sub = head.append("th").style("text-align","center")//.text("Medals Earned")
			.append("div").style("display","flex")
			sub.append("span").style("flex-grow",1).style("text-align","right").text("Bronze")
			sub.append("span").style("flex-grow",1).text("Silver")
			sub.append("span").style("flex-grow",1).text("Gold")
			sub.append("span").style("flex-grow",1).text("")
*/
		var sub = head.append("th").style("text-align","center").append("div").style("display","flex")
			sub.append("span").style("flex-grow",0).text("Last Medal")
			sub.append("span").style("flex-grow",1).text("Current Count")
			sub.append("span").style("flex-grow",0).text("Next Medal")
		var body = cont.append("tbody").selectAll("tr")
			.data(badges.filter(function(d){return d.tier.length==3;}))
		var enter = body.enter().append("tr")
			.attr("class",function(d){return "ick-b"+d.id;})
			.style("cursor","pointer")
			.attr("data-toggle","modal").attr("data-target","#ick-info")
			.on("click",function(d){tip("hide",d); updateModal(d);})
			.on('mouseover', function(d){ tip("show",d); })
			.on('mouseout', function(d){ tip("hide",d); })
			.on("mousemove", function(d) { tip("move"); })
			enter.append("td").text(function(d){return d.title;})
			enter.append("td").append("div").attr("class","ick-bronze").style("display","flex")
			enter.append("td").append("div").attr("class","ick-silver").style("display","flex")
			enter.append("td").append("div").attr("class","ick-gold").style("display","flex")
			enter.append("td").append("div").text()
			//enter.append("td").append("div").attr("class","ick-earned").style("display","flex")
			enter.append("td").append("div").attr("class","ick-progress")

		//Milestones div
		var cont = d3.select("#ick-tabMilestones").select(".panel-body")
			.append("table").attr("class","table table-striped table-hover ick-panel")
		var head = cont.append("thead").append("tr").attr()
			head.append("th").style("text-align","left").text("Badge Name")
			head.append("th").style("text-align","left").text("Milestones Reached")
		var sub = head.append("th").style("text-align","center").append("div").style("display","flex")
			sub.append("span").style("flex-grow",0).text("Last Milestone")
			sub.append("span").style("flex-grow",1).text("Current Count")
			sub.append("span").style("flex-grow",0).text("Next Milestone")
		var body = cont.append("tbody").selectAll("tr")
			.data(badges.filter(function(d){return d.tier.length>3;}))
		var enter = body.enter().append("tr")
			.attr("class",function(d){return "ick-b"+d.id;})
			.style("cursor","pointer")
			.attr("data-toggle","modal").attr("data-target","#ick-info")
			.on("click",function(d){tip("hide",d); updateModal(d);})
			.on('mouseover', function(d){ tip("show",d); })
			.on('mouseout', function(d){ tip("hide",d); })
			.on("mousemove", function(d) { tip("move"); })
			enter.append("td").text(function(d){return d.title;})
			enter.append("td").attr("class","ick-earned")
			enter.append("td").attr("colspan",2).append("div").attr("class","ick-progress")

		return Promise.resolve();
	}

	function setBadges() {
		//update earn table (2) update progress table (2)
		d3.selectAll("table.ick-panel").selectAll("tr").filter(function(d){return d && d.next;})
		.each(function(d) {
			updateEarned(d3.select(this),d);
			updateProgress(d3.select(this),d,true);
		})
		//update progress current (1)
		d3.selectAll("div.ick-panel").selectAll("div").filter(function(d){return d && d.next;})
		.each(function(d) {
			updateProgress(d3.select(this),d,false);
			//update current color
			d3.select(this).select("use").attr("class",function(){
				var t=d.currenttier;
				if(d.tier.length>3) { while(t>10){t-=10;} }
				return "ick-"+t;
			})
		})

		//update shape
		d3.selectAll(".ick-panel").selectAll("svg").filter(function(d){return d && d.next;})
			.selectAll("use").attr("xlink:href",function(d){ return "#"+d.id; })
		//update shape
		d3.selectAll(".ick-panel").selectAll("svg").filter(function(d){return d && d.next;})
			.selectAll("use.ick-stack").attr("xlink:href",function(d){ return "#stack"; })
	}

	//update
	function updateEarned(div,d) {
/*		var line=div.select(".ick-earned").html("");
		if(d.tier.length==3) {//medal
			line.append("span").style("flex-grow",1).style("flex-basis",0)
				.style("text-align","right").style("font-weight","bold")
				.attr("class",function(){ return d.count[1]==0 ? "text-muted" : "";})
				.html("&nbsp;"+d.count[1]+"x"+"&nbsp;")
			line.append("svg").style("flex-grow",0)
				.attr("width","25px").attr("height","25px")
				.append("use").attr("class","ick-b")

			line.append("span").style("flex-grow",1).style("flex-basis",0)
				.style("text-align","right").style("font-weight","bold")
				.attr("class",function(){ return d.count[2]==0 ? "text-muted" : "";})
				.html("&nbsp;"+d.count[2]+"x"+"&nbsp;")
			line.append("svg").style("flex-grow",0)
				.attr("width","25px").attr("height","25px")
				.append("use").attr("class","ick-s")

			line.append("span").style("flex-grow",1).style("flex-basis",0)
				.style("text-align","right").style("font-weight","bold")
				.attr("class",function(){ return d.count[3]==0 ? "text-muted" : "";})
				.html("&nbsp;"+d.count[3]+"x"+"&nbsp;")
			line.append("svg").style("flex-grow",0)
				.attr("width","25px").attr("height","25px")
				.append("use").attr("class","ick-g")
			line.append("span").style("flex-grow",1).style("flex-basis",0)
		}
*/
		var line;
		if(d.tier.length==3) {//medal
			line=div.select(".ick-bronze").html("");
			line.append("span").style("flex-grow",1).style("flex-basis",0)
				.style("text-align","right").style("font-weight","bold")
				.attr("class",function(){ return d.count[1]==0 ? "text-muted" : "";})
				.html("&nbsp;"+d.count[1]+"x"+"&nbsp;")
			line.append("svg").style("flex-grow",0)
				.attr("width","25px").attr("height","25px")
				.append("use").attr("class","ick-b")

			line=div.select(".ick-silver").html("");
			line.append("span").style("flex-grow",1).style("flex-basis",0)
				.style("text-align","right").style("font-weight","bold")
				.attr("class",function(){ return d.count[2]==0 ? "text-muted" : "";})
				.html("&nbsp;"+d.count[2]+"x"+"&nbsp;")
			line.append("svg").style("flex-grow",0)
				.attr("width","25px").attr("height","25px")
				.append("use").attr("class","ick-s")

			line=div.select(".ick-gold").html("");
			line.append("span").style("flex-grow",1).style("flex-basis",0)
				.style("text-align","right").style("font-weight","bold")
				.attr("class",function(){ return d.count[3]==0 ? "text-muted" : "";})
				.html("&nbsp;"+d.count[3]+"x"+"&nbsp;")
			line.append("svg").style("flex-grow",0)
				.attr("width","25px").attr("height","25px")
				.append("use").attr("class","ick-g")
		}
		else {//milestone
			line=div.select(".ick-earned").html("");
			var t=d.currenttier;
			while(t>=10){
/*				var stack=line.append("svg")
				.attr("width","50px").attr("height","25px");
				for(var i=1;i<=10;i++){
					stack.append("svg")
					.attr("width","25px").attr("height","25px")
					.attr("transform","translate("+(2*i)+",0)")
					.append("use").attr("class","ick-"+i)
				}
*/
				var stack=line.append("svg")
				.attr("width","50px").attr("height","25px");
				stack.append("use").attr("class","ick-stack")
					.attr("xlink:href","#stack")
     			stack.append("g").attr("transform","translate(10,0)")
        		.append("use").attr("class","ick-10")

				t-=10;
			}
			//line.append("span").html("&nbsp;+&nbsp;")
			for(var j=1;j<=t;j++){
				line.append("svg")
				.attr("width","25px").attr("height","25px")
				.append("use").attr("class","ick-"+j)
			}
		}
	}

	function updateProgress(div,d,b) {
		var line=div.select(".ick-progress").style("display","flex").html("");
		if(b){
			line.append("svg").attr("class","ick-current")
			.attr("width","25px").attr("height","25px")
			.append("use").attr("class",function(){
				var t=d.currenttier;
				while(t>10){t-=10;}
				return "ick-"+t;
			})
		}

		line.append("div").attr("class","progress").style("width","100%")
			.append("div").attr("class","progress-bar progress-bar-info")
			.attr("aria-valuemin",0).attr("aria-valuemax",d.next).attr("aria-valuenow",f(d.currentcount))
			.style("width",d.percent+"%")
			.append("span").text(f(d.currentcount))

		if(b){
			line.append("svg").attr("class","ick-next")
			.attr("width","25px").attr("height","25px")
			.append("use").attr("class",function(){
				var t=d.currenttier;
				if(t==0 && d.tier.length==3) {t="b";}
				else if(t=="b") {t="s";}
				else if(t=="s") {t="g";}
				else if(t=="g") {t="g";}
				else {
					while(t>10){t-=10;}
					t++;
				}
				if(t==11){t=1;}
				return "ick-"+t;
			})
		}
	}

	function updateModal(d) {
		var div = d3.select("#ick-info").datum(d);
		div.select(".modal-title").text(d.title)
		div.select(".ick-legend").text(d.legend)
		updateEarned(div,d);
		div.select("span.ick-current").text(f(d.currentcount))
		div.select("span.ick-next").html(function(){return d.currentcount==d.next ? "-" : f(d.next)})
		updateProgress(div,d,true);

		div.selectAll("svg").selectAll("use").attr("xlink:href","#"+d.id)
		div.selectAll("svg").selectAll("use.ick-stack").attr("xlink:href","#stack")
	}

	//utils
	function getBadge(id) { //return the badge with id=id
		var obj = 0;
		for(var i=0;(obj==0 && i<badges.length);i++) {
			if(badges[i].id==id) {obj=badges[i];}
		}
		return obj;
	}

	function tip(state,d) {
		// console.log("tip",state);
		if(state=="show") {
			d3.select("#ick-tip")
				.datum(d)
				.style("opacity",1)
				.text(function(d) { return d.legend; })
		}
		else if(state=="hide") {
			d3.select("#ick-tip").style("opacity",0)
		}
		else { // move
			d3.select("#ick-tip").style("top", (d3.event.pageY+10)+"px")
            .style("left", (d3.event.pageX+10)+"px")
		}
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
