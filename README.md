# iclikval-badges
iclikval-badges is a micro-service design to works with **iCLiKVAL** (http://iclikval.riken.jp/). 
It requests the annotations of a specific user, and displays various rewards according to the number and the type of annotations.

The service run on **node** server (https://nodejs.org/en/).

# Authentification
For security reason, a app token is needed to request iCLiKVAL API.
For same purpose, a app key is needed to request iclikval-badges.
Before running the application on your server you need to add these token and key in a file

In "middlewares" folder, create "auth.json" file.

~~~
{
"token":"[iCLiKVAL-Access-Token]",
"[client1-IP]":"[client1-application-key]",
"[client2-IP]":"[client2-application-key]"
}
~~~

Modify the [...] elements acording to your configuration

We suggest the use of **uuid** (https://github.com/broofa/node-uuid) to generate application-key

# Run the application

~~~
node app.js
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


