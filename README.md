# iclikval-badges

iclikval-badges is a micro-service design to works with **iCLiKVAL** (http://iclikval.riken.jp/).
It requests the annotations of a specific user, and displays various rewards according to the number and the type of annotations.

The service run on **node** server (https://nodejs.org/en/).

# Configuration

For security reason, a app key is needed to request iclikval-badges.
Before running the application on your server you need to add these key in a file

In root folder, create "config.json" file.

~~~
{
	"port":[....],
	"keys": {
		"[client1-IP]":"[client1-application-key]",
		"[client2-IP]":"[client2-application-key]"
		}
}
~~~

Modify the [...] elements according to your configuration

We suggest the use of **uuid** (https://github.com/broofa/node-uuid) to generate application-key

# Server instalation

~~~
npm install
~~~

# Run application

~~~
node ./app.js
~~~

# Client web page

On your web page, include the following code

~~~
<script type="text/javascript"
	data-app-key="[client1-application-key]"
	data-username="[username]"
	data-url="[server-address]">
function ickinclude(t){var e=document.currentScript,a=document.createElement("script");a.type="text/javascript",a.src=t+"/js/iclikval-badges.js",a.onload=function(){return ick.load(t,e.getAttribute("data-app-key"),e.getAttribute("data-username"))},document.getElementsByTagName("head")[0].appendChild(a)}ickinclude(document.currentScript.getAttribute("data-url"));
</script>
~~~

Modify the [...] elements according to your configuration
