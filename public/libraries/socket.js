// ZIM - https://zimjs.com - Code Creativity!
// JavaScript Canvas Framework for General Interactive Media
// free to use - donations welcome of course! https://zimjs.com/donate

// ZIM SOCKET - see https://zimjs.com/socket for examples and server info

// ~~~~~~~~~~~~~~~~~~~~~~~~
// DESCRIPTION - coded in 2015 (c) ZIM
// zimsocket.js provides code for multiuser sockets to share properties
// a client sends properties and receives objects of others' properties
// requires socket.io and a server running NodeJS and zimserver.js

// The Socket Module has Socket()

// DOCS
// Docs are provided at https://zimjs.com/docs.html
// See SOCKET MODULE at bottom
// ~~~~~~~~~~~~~~~~~~~~~~~~

var WW = window||{};

var zim = function(zim) {

	// borrowed from ZIM in case used on its own

	var zog = console.log.bind(console);

	if (WW.zon) zog("ZIM SOCKET Module");

	function zot(v) {
		if (v === null) return true;
		return typeof v === "undefined";
	}

	zim.merge = function() {
		var obj = {}; var i; var j;
		for (i=0; i<arguments.length; i++) {
			for (j in arguments[i]) {
				if (arguments[i].hasOwnProperty(j)) {
					obj[j] = arguments[i][j];
				}
			}
		}
		return obj;
	}

	zim.copy = function(obj) {
		if (obj==null || typeof obj != 'object') return obj;
		if (obj instanceof Array) {
			return obj.slice(0);
		}
		if (obj instanceof Object) {
			var copy = {};
			for (var attr in obj) {
				if (obj.hasOwnProperty(attr)) copy[attr] = zim.copy(obj[attr]);
			}
			return copy;
		}
	}

	zim.EventDispatcher = function(target) {
		this.listeners = {};
		this.target = target;
		var that = this;
		this.addEventListener = function (type, listener) {
			if (!that.listeners[type]) {
				that.listeners[type] = [];
			}
			that.listeners[type].push(listener);
		}
		this.removeEventListener = function (type, listener) {
			var listenList = that.listeners[type];
			for (var i=0; i<listenList.length; i++) {
				if (listenList[i] === listener) {
					listenList.splice(i, 1);
				}
			}
		}
		this.removeAllEventListeners= function() {
			this.listeners = {};
		}
		this.dispatchEvent = function (type, params) {
			var listenList = that.listeners[type];
			var success = false;
			if (listenList) {
				for (var i=0; i<listenList.length; i++) {
					try {
						listenList[i].call(that, params);
						success = true;
					} catch (e) {
						zog("ZIM DispatchEvent() error: " + type + " " + e);
					}
				}
			}
			return success;
		}
		this.on = this.addEventListener;
		this.off = this.removeEventListener;
		this.offAll = this.removeAllEventListeners;
	}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ZIM SOCKET CODE

	zim.Socket = function(server, appName, roomName, maxPeople, fill, initObj) {
		var sig = "server, appName, roomName, maxPeople, fill, initObj";
		var duo; if (duo = zob(zim.Socket, arguments, sig, this)) return duo;

		zim.EventDispatcher.call(this, this);

		if (zot(server)) server = this.server = "https://localhost:3000/";
		if (zot(appName) || appName == "") {zog("zim socket - Socket():\nmust provide app name"); return;}

		this.ready = false;
		var that = this;
		var noSocket = "zim socket - Socket(): sorry no socket";
		var socket;
		var data;
		var historyString;
		var current; // {id:{id:"a2s2d24fa2sd", x:20, y:30}, id2:{id2:831kh4597kh, x:22, y:66}}
		var last;  // {id:lastUpdaterID, properties:{text:[id,"hi"], x:[id2,100], y:[id3,"10"]}}
		var my; // {id:"asfwer3231dsa", x:22, y:44, text:"cool"}

		function connect() {
			socket = that.socket = io.connect(server);
		}
		connect();
		socket.on("connect", function() {
			addEventListeners();
			joinRoom(appName, roomName, maxPeople, fill, initObj);
		});

		function addEventListeners() {
			socket.on("join", join);
			socket.on("receive", receive);
			socket.on("time", time);
			socket.on("sync", sync);
			socket.on("otherleave", otherLeave);
			socket.on("connect_error", connectError);
			socket.on("disconnect", disconnect);
		}

		function joinRoom(appName, roomName, maxPeople, fill, initObj) {
			if (zot(appName) || appName == "") {zog("zim socket - Socket():\nmust provide app name"); return;}
			appName = that.applicationName = appName.replace(/\s/, "").toLowerCase();
			if (roomName) {that.roomName = roomName.replace(/\s/, "").toLowerCase();} // can be null
			if (zot(maxPeople)) maxPeople = that.maxPeople = 0;
			if (zot(fill)) fill = that.fill = true; // fills in room if people leave

			data = {appName:appName, roomName:roomName, maxPeople:maxPeople, fill:fill, initObj:initObj};
			my = initObj || {};
			socket.emit('join', data);
		}


		// --------------    EVENTS   ---------------

		function join(data) {
			// event when this person joins a room
			that.masterTime = data.masterTime;
			that.joinTime = data.joinTime;
			historyString = data.history;
			last = data.last;
			current = data.current;
			that.id = my.id = data.id;
			that.master = (that.size==0);
			if (!that.ready) {
				that.dispatchEvent("ready", current);
				that.ready = true;
			} else {
				that.dispatchEvent("roomchange", current);
			}
		}

		function receive(data, type) {
			if (data && data.zimMaster) {
				that.master = (that.id == data.zimMaster);
				return;
			}
			// event for receiving data from another person
			var id = that.senderID = data.id;
			// update current values
			current[id] = zim.merge(current[id], data);
			// update last information (responsible for keeping last up to date)
			last.id = id;
			for (var i in data) {
				last.properties[i] = [id, data[i]];
			}
			if (type == "message") {
				that.dispatchEvent("data", data); // for other people's
			} else if (type == "join") {
				that.lastJoinID = id;
				that.dispatchEvent("otherjoin", data);
			}
		}

		function time(data) {
			// event for receiving time (masterTime and currentTime)
			data.joinTime = that.joinTime;
			that.dispatchEvent("time", data);
		}

		function sync(data) {
			// event for syncing data
			that.masterTime = data.masterTime;
			that.joinTime = data.joinTime;
			historyString = data.history;
			last = data.last;
			current = data.current;
			that.id = my.id = data.id;
			that.dispatchEvent("sync", data);
		}

		function otherLeave(id) {
			// event when another person leaves the room
			that.lastLeaveID = id;
			that.dispatchEvent("otherleave", current[id]);
			// data is removed as other leaves so update current and last
			// after we dispatch otherleave event to give chance to see their data
			delete current[id];
			// note, the leaving client's id is still kept in the last data
		}

		function connectError() {
			that.ready = false;
			that.dispatchEvent("error");
			removeEventListeners();
		}

		function disconnect() {
			if (that.master && that.size > 0) {
				for (var id in current) {
					socket.emit('message', {zimMaster: id});
					break;
				}				
			}
			socket.emit('message', {disconnect: {master:that.master, size:that.size, current:current}});
			that.ready = false;
			that.dispatchEvent("disconnect");
			removeEventListeners();
		}

		WW.onbeforeunload = disconnect;


		// --------------    MISC   ---------------

		function removeEventListeners() {
			socket.removeEventListener("receive", receive);
			socket.removeEventListener("join", join);
			socket.removeEventListener("time", time);
			socket.removeEventListener("sync", sync);
			socket.removeEventListener("otherleave", otherLeave);
			socket.removeEventListener("connect_error", connectError);
			socket.removeEventListener("disconnect", disconnect);
		}

		// various socketio connect errors are not firing for me
		var connectionTries = 0;
		var timer = WW.setInterval(function() {
			if (socket.connected) {
				WW.clearInterval(timer);
			} else {
				connectionTries++;
				if (connectionTries > 4) {
					WW.clearInterval(timer);
					that.dispatchEvent("error");
					socket.disconnect();
				} else {
					connect();
				}
			}
		}, 1000);


		// --------------    PROPERTIES   ---------------

		Object.defineProperty(this, 'history', {
			get: function() {
				return historyString;
			},
			set: function(value) {
				zog("zim socket - Socket(): history is read only (try appendToHistory() and clearHistory() methods)");
			}
		});

		Object.defineProperty(this, 'size', {
			get: function() {
				var count = 0;
				for (var i in current) count++;
				return count;
			},
			set: function(value) {
				zog("zim socket - Socket(): size is read only (perhaps see maxPeople)");
			}
		});


		// --------------    METHODS   ---------------

		this.changeRoom = function(appName, roomName, maxPeople, fill, initObj) {
			joinRoom(appName, roomName, maxPeople, fill, initObj);
			// will trigger a ZIM Socket ready event for this client
			// will trigger a ZIM Socket otherleave and otherjoin events for other clients
		}

		this.requestTime = function() {
			socket.emit('time'); // will trigger a ZIM Socket time event
		}

		this.requestSync = function() {
			socket.emit('sync'); // will trigger a ZIM Socket sync event
		}

		// SETTING YOUR PROPERTIES

		this.setProperty = function(propertyName, propertyValue) {
			if (!socket) {zog(noSocket); return;}
			if (zot(propertyName)) {zog("zim socket - Socket.setProperty(): please enter property name"); return;}
			var object = {};
			object[propertyName] = propertyValue;
			my[propertyName] = propertyValue;

			last.id = that.id;			
			last.properties[propertyName] = [that.id, propertyValue];	

			socket.emit('message', object);
			// will trigger a ZIM Socket data event for other clients in the room
		}

		this.setProperties = function(object) {
			if (!socket) {zog(noSocket); return;}
			if (zot(object) || typeof object !== 'object' || Array.isArray(object)) {zog("zim socket - Socket.setProperties(): please enter object of properties"); return;}
			my = zim.merge(my, object);

			for (var i in object) {
				last.properties[i] = [that.id, object[i]];
			}

			socket.emit('message', object);
			// will trigger a ZIM Socket data event for other clients in the room
		}

		// GETTING PROPERTIES AND PROPERTY OBJECTS

		this.getMyProperty = function(propertyName) {
			// gets your own value for property name
			return my[propertyName];
		}

		this.getMyData = function() {
			// gets your own data object
			return my;
		}

		this.getOtherProperty = function(id, propertyName) {
			// gets another client's value for property name			
			if (!current || !current[id]) return;
			return current[id][propertyName];
		}

		this.getOtherData = function(id) {
			// gets another client's object of properties
			if (current) return current[id];
		}

		this.getSenderProperty = function(propertyName) {
			// gets sender client's value for property name
			if (!that.senderID) return;
			if (!current[that.senderID]) return;
			return current[that.senderID][propertyName];
		}

		this.getSenderData = function() {
			// gets sender client's object of properties
			if (!that.senderID) return;
			return current[that.senderID];
		}

		this.getProperties = function(propertyName) {
			// returns a array of values for the propertyName of others - for x we might get [12, 14, 33, etc.]
			if (zot(propertyName)) return;
			var list = []; var val;
			for (var i in current) {
				val = current[i][propertyName];
				if (val) list.push(val);
			}
			return list;
		}

		this.getData = function() {
			// returns object of all client data (not own)
			return current;
		}


		// LATEST

		this.getLatestValue = function(propertyName) {
			// gets latest value of a property
			if (zot(last.properties[propertyName]) || last.properties[propertyName] == "undefined") return null;
			return last.properties[propertyName][1];
		}
		
		this.getLatestTime = function(propertyName) {
			// gets latest time of a property
			if (zot(last.properties[propertyName])) return undefined;
			return last.properties[propertyName][2];
		}

		this.getLatestValueID = function(propertyName) {
			// gets id of latest updater for a property
			if (zot(last.properties[propertyName])) return undefined;
			return last.properties[propertyName][0];
		}

		this.getLatestProperties = function() {
			// gets an array of the last properties (names) sent - could be one or more
			var list = [];
			for (var property in last.properties) {
				if (last.properties[property][0] == last.id) {
					list.push(property);
				}
			}
			return list;
		}

		// HISTORY

		this.appendToHistory = function(someText) {
			// sends text to be stored on history
			// need to send \n as well if desired
			// only used for new people to join
			if (!socket) {zog(noSocket); return;}
			socket.emit('history', someText);
		}

		this.clearHistory = function() {
			if (!socket) {zog(noSocket); return;}
			historyString = "";
			socket.emit('clearhistory');
		}

		// TO DISCONNECT

		this.dispose = function() {
			socket.disconnect();
			removeEventListeners();
			current = null;
			last = null;
			// will trigger a ZIM Socket otherleave event for other clients in the room
		}

	}
	zim.Socket.prototype = new zim.EventDispatcher();
	zim.Socket.prototype.constructor = zim.Socket;

	return zim;
}(zim || {});

if (!WW.zns) WW.Socket = zim.Socket;