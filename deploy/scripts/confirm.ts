import { stdin as input, stdout as output } from 'node:process'
import readline from 'node:readline/promises'

type ConfirmationLogger = {
	info: (message: string) => void
}

export const requireConfirmation = async (
	phrase: string,
	message: string,
	logger?: ConfirmationLogger
) => {
	if (process.env.REMOTE_CONFIRM === phrase) {
		return
	}

	if (!process.stdin.isTTY) {
		throw new Error(`Refusing destructive operation. Set REMOTE_CONFIRM="${phrase}".`)
	}

	if (logger) {
		logger.info(message)
		logger.info(`Type ${phrase} to continue.`)
	} else {
		console.log(message)
		console.log(`Type ${phrase} to continue.`)
	}

	const rl = readline.createInterface({ input, output })
	const answer = await rl.question('Confirmation: ')
	rl.close()

	if (answer.trim() !== phrase) {
		throw new Error('Confirmation did not match.')
	}
}
