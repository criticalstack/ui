var colors = require("colors/safe");

module.exports = function(result) {
  var messages = result.messages;

  if (messages.length === 0) {
    return;
  }

  console.log("\n" + result.filePath);

  for (var i = 0, len = messages.length; i < len; i++) {
    var message = messages[i];

    var sev = colors.red("[FAIL]");
    if (message.severity === 1) {
      sev = colors.yellow("[ERROR]");
    }

    var id = "[" + message.ruleId + "]";
    var path = result.filePath;
    var line = "L:" + colors.bold.yellow(message.line);
    var col = "C:" + colors.bold.yellow(message.column);
    var msg = colors.green(message.message);

    console.log(sev + " " + id + " " + path + " " + line + " " + col + " " + msg);
  }
};
