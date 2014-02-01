var http       = require('http'),
    connect    = require('connect'),
    bodyParser = require('body-parser'),
    spawn      = require('child_process').spawn,
    domain     = require('domain'),
    hostile    = require('hostile'),
    ignores    = require('../ddnsIgnore.json'),
    server;

const MAC   = (process.platform === 'darwin');

var dnsRestartOnMac = function () {
	var child = spawn('launchctl', ['unload', '/Library/LaunchDaemons/homebrew.mxcl.dnsmasq.plist']);
	child.on('close', function () {
		spawn('launchctl', ['load', '/Library/LaunchDaemons/homebrew.mxcl.dnsmasq.plist']);
	});
};

var dnsRestartOnLinux = function (){
	var child = spawn('/etc/init.d/dnsmasq', ['stop']);
	child.on('close', function () {
		spawn('/etc/init.d/dnsmasq', ['start']);
	});
};

var dnsRestart = MAC ? dnsRestartOnMac : dnsRestartOnLinux;
var port = 8053;
var app  = connect();
app.use(bodyParser());
app.use(function (req, res) {

	var d = domain.create();
	d.on('error', function () {
		res.writeHead(400);
		res.end();
	});

	console.log(req.body);

	if (!req.body.hostname) {
		res.writeHead(400);
		res.end();
		return;
	}

	var ipAddr   = req.headers['x-forwarded-for'] || req.connection.remoteAddress,
	    hostname = req.body.hostname;

	const IPADDR   = 0;
	const HOSTNAME = 1;

	var isIgnore = function (ipAddr, hostname) {
		var which = false;
		ignores.forEach(function (ignore) {
			if (ipAddr === ignore[IPADDR] && hostname === ignore[HOSTNAME]) {
				which = true;
			}
		});
		return which;
	};


	var getHost = function (hostname, cb) {
		hostile.get(false, function (err, hosts) {
			if (err) {
				cb(err);
				return;
			}

			sameNames = hosts.filter(function (host) {
				return Array.isArray(host) && host[HOSTNAME] === hostname;
			});

			if (!sameNames.length) {
				cb();
				return;
			}

			cb(null, sameNames[0]);
		});
	};

	var delHost = function (ipAddr, hostname, cb) {
		if (isIgnore(ipAddr, hostname)) { // Can't remove the host.
			cb(new Error('Can\'t remove host in dnsignore'));
			return;
		}

		hostile.remove(ipAddr, hostname, cb);
	};

	var setHost = function (ipAddr, hostname, cb) {
		hostile.set(ipAddr, hostname, function (err) {

			if (err) {
				cb(err);
				return;
			}

			console.log('Bind ' + ipAddr + ' to ' + hostname);
			dnsmasqRestart(); // dnsmasq restart.

		});
	};

	getHost(hostname, d.intercept(function (host) {

		if (host) {
			delHost(host[IPADDR], host[HOSTNAME], d.intercept(function () {
				setHost(ipAddr, hostname, d.intercept(function () {
					res.writeHead(400);
					res.end();
				}));
			}));
		} else {
			setHost(ipAddr, hostname, d.intercept(function () {
				res.writeHead(400);
				res.end();
			}));
		}
	}));
});

http.createServer(app).listen(port);