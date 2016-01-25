/// <reference path="../typings/node/node" />

var fs = require("fs")

module TsRefWalker {
	export class Program {
		private defaultCommand = "update"
		constructor(private commands: string[]) {
			this.commands = this.commands.slice(2)
			if (this.commands.length == 0) {
				this.commands.push(this.defaultCommand)
				this.commands.push(".")
			}
		}
		private createArray<T>(value: T, count: number): T[] {
			var result: T[] = []
			while (count-- > 0)
				result.push(value)
			return result
		}
		private walk(file: string, result: string[]) {
			var pathMatch = file.match(/.*\//)
			var path = pathMatch && pathMatch.length == 1 ? pathMatch[0] : "./"
			if (!file.match(/.ts/))
				file = file + ".ts"
			var content: string = fs.readFileSync(file, "utf-8")
			var matches = content.match(/\/\/\/ <reference path="(.*)" \/>/g)
			if (matches)
				matches.forEach((match) => {
					var f = match.match(/".*"/)[0].slice(1, -1)
					if (f[0] != "/")
						f = path + f
					var skip = 0
					f = f.split("/").reverse().filter(item => {
						var r = false
						if (item == ".")
							;
						else if (item == "..")
							skip++
						else if (skip > 0)
							skip--
						else
							r = true
						return r
					}).concat(this.createArray("..", skip)).reverse().join("/")
					if (result.indexOf(f) < 0)
						this.walk(f, result)
				})
			if (!result.some(item => item == file))
				result.push(file)
			return result
		}
		private runHelper(command: string, commands: string[]) {
			switch (command) {
				case "list":
					var files = this.walk(commands.shift(), [])
					var file: string
					while (file = files.shift())
						console.log(file)
					break
				case "update":
					var configurationFile = "./tsconfig.json"
					while ((command = commands.shift())[0] == "-")
						switch (command) {
							case "-c":
							case "--config":
								configurationFile = commands.shift()
								break
						}
					var configuration = JSON.parse(fs.readFileSync(configurationFile))
					configuration.files = this.walk(command, [])
					var configurationContent = JSON.stringify(configuration, null, "\t")
					console.log(configurationContent)
					fs.writeFile(configurationFile, configurationContent)
					break
				case "version": console.log("writeup " + this.getVersion()); break
				case "help": console.log("help")
					console.log("tsrefwalker list [root.ts]")
					console.log("tsrefwalker update [root.ts]")
					console.log("tsrefwalker update --config [path/to/tsconfig.ts] [root.ts]")
					break
				default:
					commands.push(command)
					command = undefined
					this.runHelper(this.defaultCommand, commands)
					break
			}
			if (command)
				this.defaultCommand = command
		}
		run() {
			var command: string
			while (command = this.commands.shift())
				this.runHelper(command, this.commands)
		}
		getVersion(): string {
			return "0.1"
		}
	}
}
new TsRefWalker.Program(process.argv).run()
