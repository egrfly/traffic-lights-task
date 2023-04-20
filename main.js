const aspects = document.querySelectorAll(".aspect")
const commandBox = document.getElementById("commands")
const errorBox = document.getElementById("error")
const startButton = document.getElementById("start")
const stopButton = document.getElementById("stop")

let startTimeout = null
let abortController = null

function setError(errorMessage) {
  errorBox.textContent = errorMessage
}

function clearStartTimeout() {
  if (startTimeout) {
    clearTimeout(startTimeout)
    startTimeout = null
  }
}

function clearAbortController() {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
}

function clearError() {
  setError("")
}

function clearAspects() {
  aspects.forEach((aspect) => {
    aspect.classList.remove("aspect--active")
  })
}

function stop() {
  clearStartTimeout()
  clearAbortController()
  clearError()
  clearAspects()
}

function wait(seconds) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

class Command {
  constructor(commandText) {
    this.commandText = commandText
    this.commandTokens = commandText.trim().split(/\s+/)
  }

  isEmpty() {
    return this.commandTokens.length === 0
  }

  isAspectCommand() {
    return this.commandTokens.length === 2 && ["red", "amber", "green"].includes(this.commandTokens[0]) && ["on", "off"].includes(this.commandTokens[1])
  }

  isWaitCommand() {
    return this.commandTokens.length === 2 && this.commandTokens[0] === "wait" && !isNaN(parseFloat(this.commandTokens[1]))
  }

  isValid() {
    return this.isEmpty() || this.isAspectCommand() || this.isWaitCommand()
  }

  execute(abortSignal) {
    return new Promise((resolve, reject) => {
      if (abortSignal.aborted) {
        reject()
      }
      let commandTimeout = null
      if (this.isAspectCommand()) {
        const aspect = document.getElementById(this.commandTokens[0])
        this.commandTokens[1] === "on" ? aspect.classList.add("aspect--active") : aspect.classList.remove("aspect--active")
        commandTimeout = setTimeout(resolve, 40)
      } else if (this.isWaitCommand()) {
        const duration = parseFloat(this.commandTokens[1])
        commandTimeout = setTimeout(resolve, duration * 1000)
      } else {
        resolve()
      }
      abortSignal.addEventListener("abort", () => {
        if (commandTimeout) {
          clearTimeout(commandTimeout)
          reject()
        }
      })
    })
  }
}

async function start() {
  abortController = new AbortController()
  try {
    const commands = commandBox.value.split(/[\r\n]+/).filter(Boolean).map((commandText) => new Command(commandText))
    const invalidCommands = commands.filter((command) => !command.isValid())
    if (invalidCommands.length > 0) {
      stop()
      setError(`Sorry, I didn't recognise the command "${invalidCommands[0].commandText}"`)
    } else if (commands.length > 0) {
      while (true) {
        for (const command of commands) {
          await command.execute(abortController.signal)
        }
      }
    }
  } catch {
  } finally {
    abortController = null
  }
}

startButton.addEventListener("click", function() {
  stop()
  startTimeout = setTimeout(start, 75)
})

stopButton.addEventListener("click", stop)
