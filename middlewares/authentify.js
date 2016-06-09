//require
var fs = require('fs');
var path = require('path');

module.exports = function(req, res, next) {
	//get auth
	fs.readFile(path.join(__dirname,"auth.json"), function(err, data){
		if(err) {
			res.status(500);
 			res.json({
 				"status": 500,
 				"message": "authentification db not found",
  				"error": err
  			});
		}
		else {
			auth=JSON.parse(data);
			//id client
			var ip = req.headers.origin ? req.headers.origin.replace("http://", "") : req.headers["x-forwarded-host"] ;
			console.log("Request from",ip);
		
			//verify user
			if(auth[ip]) { //User exist
				if(req.body.key) { // Key exist
					if (auth[ip]==req.body.key) {
						next();
					}
					else {//invalid key
						res.status(401);
					    res.json({
					      "status": 401,
					      "message": "Invalid Key"
					    });
					    return;
					}
				}
				else { //key not found
					res.status(400);
			        res.json({
			          "status": 400,
			          "message": "App key not found"
			        });
			        return;
				}
			}
			else { //"Invalid User"
		 		res.status(401);
		        res.json({
		          "status": 401,
		          "message": "Unauthorized access"
		        });
		        return;
			}
		}
	});
}

