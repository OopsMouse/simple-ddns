#simple-ddns

Simple Dynamic DNS Server & Client.

##Installation

If you deploy ddns server, you must install dnsmasq. Please see [this](http://www.thekelleys.org.uk/dnsmasq/doc.html) for the details.

	$ [sudo] npm install -g https://github.com/OopsMouse/simple-ddns/tarball/master

##Usage

###Server

	$ [sudo] ddns-server

###Client

	$ [sudo] ddns-client --help
		
		Options:
		  --url       DDNS server rul         [default: "http://localhost:8053"]
		  --hostname  the machine's hostname  [default: "localhost"]
		  --interval  update intarval         [default: 3600]
