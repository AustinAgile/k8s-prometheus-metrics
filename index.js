'use strict';

var async = require('async');
var exec = require('child_process').exec;

function getSimpleNumber(command, setter, cb) {
	exec(command, function(err, stdout, stderr) {
		if (err) {
			// should have err.code here?
		}
		setter.set(Number(stdout));
		cb();
	});
}

var os = require('os');
console.log(os.freemem());
console.log(os.totalmem());

const client = require('prom-client');
client.collectDefaultMetrics();

const coreMetrics = {
	utilization: {
		cpu: new client.Gauge({name: 'container_cpu_utilization', help: 'cpu utilization'}),
		memory: new client.Gauge({name: 'container_memory_utilization', help: 'memory utilization'}),
		disk: new client.Gauge({name: 'container_disk_utilization', help: 'disk utilization'})
	},
	network: {
		sent: new client.Gauge({name: 'container_bytes_sent', help: 'bytes sent'}),
		received: new client.Gauge({name: 'container_bytes_received', help: 'bytes received'}),
		errors: new client.Gauge({name: 'container_network_errors', help: 'network errors'})
	},
	memoryPageFaults: new client.Gauge({ name: 'container_memory_page_faults', help: 'memory page faults' }),
	uptime: new client.Gauge({ name: 'container_uptime', help: 'uptime' })
};
const errors = {
	publisher: {
		none: new client.Gauge({name: 'no_publisher_connection', help: 'count times there is not a valid publisher connection'})
	}
};

var process_cpu_user_seconds_total = client.register.getSingleMetric('process_cpu_user_seconds_total');
var process_start_time_seconds = client.register.getSingleMetric('process_start_time_seconds');

var process_resident_memory_bytes = client.register.getSingleMetric('process_resident_memory_bytes');

const express = require('express');
const app = express();
app.set('etag', false);
app.set('x-powered-by', false);

app.get('/metrics', function (req, res) {
	console.log(client.register.metrics());

	async.parallel(
		[
			function(cb) {
				exec("ps -axo maj_flt", function(err, stdout, stderr) {
					if (err) {
						// should have err.code here?
					}
					coreMetrics.memoryPageFaults.set(stdout.match(/(\d+)/g).reduce(function(a, v) {return a+Number(v);}, 0));
					cb();
				});
			},
			function(cb) {
				exec("df --local --total --output='source','size','used','pcent'", function(err, stdout, stderr) {
					if (err) {
						// should have err.code here?
					}
					var matches = /total\s+(\d+)\s+(\d+)/g.exec(stdout);
					//console.log(matches);
					coreMetrics.utilization.disk.set(matches[2]/matches[1]);
					cb();
				});
			},
			function(cb) {
				exec("cat /sys/class/net/eth0/statistics/rx_bytes", function(err, stdout, stderr) {
					if (err) {
						// should have err.code here?
					}
					coreMetrics.network.received.set(Number(stdout));
					cb();
				});
			},
			function(cb) {
				exec("cat /sys/class/net/eth0/statistics/tx_bytes", function(err, stdout, stderr) {
					if (err) {
						// should have err.code here?
					}
					coreMetrics.network.sent.set(Number(stdout));
					cb();
				});
			},
			function(cb) {
				getSimpleNumber("cat /sys/class/net/eth0/statistics/tx_errors", coreMetrics.network.errors, cb);
			}
		],
		function(err, result) {
			var totalSeconds = process_cpu_user_seconds_total.hashMap[''].timestamp/1000 - process_start_time_seconds.hashMap[''].value;
			coreMetrics.utilization.cpu.set(process_cpu_user_seconds_total.hashMap[''].value / totalSeconds);
			coreMetrics.utilization.memory.set(os.freemem()/os.totalmem());
			coreMetrics.uptime.set(new Date()/1000 - process_start_time_seconds.hashMap[''].value);

			res.header("Content-Type", "text/plain");
			res.send(new Buffer(client.register.metrics()));
		}
	);
});

app.listen(9143, function () {
	console.log("listening on 9143");
});

module.exports = function() {
	return client;
};
