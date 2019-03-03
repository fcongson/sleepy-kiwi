import * as Alexa from 'ask-sdk-core'
import * as Raven from 'raven'

require('dotenv').config({ path: './variables.env' })

Raven.config(process.env.SENTRY_DSN).install()

const invocationName = 'sleepy kiwi'

/**
 * language model
 */

const model = {
  interactionModel: {
    languageModel: {
      invocationName: 'sleepy kiwi',
      intents: [
        {
          name: 'AMAZON.FallbackIntent',
          samples: [],
        },
        {
          name: 'AMAZON.CancelIntent',
          samples: [],
        },
        {
          name: 'AMAZON.HelpIntent',
          samples: [],
        },
        {
          name: 'AMAZON.StopIntent',
          samples: [],
        },
        {
          name: 'AMAZON.NavigateHomeIntent',
          samples: [],
        },
        {
          name: 'sayGoodnight',
          slots: [
            {
              name: 'kiwi',
              type: 'kiwis',
            },
          ],
          samples: [
            `tell {kiwi} you're going to bed`,
            'wish {kiwi} a goodnight',
            'say goodnight to {kiwi}',
          ],
        },
        {
          name: 'AMAZON.NoIntent',
          samples: [],
        },
        {
          name: 'LaunchRequest',
        },
      ],
      types: [
        {
          name: 'kiwis',
          values: [
            {
              name: {
                value: 'jami',
              },
            },
            {
              name: {
                value: 'bub',
              },
            },
            {
              name: {
                value: 'lil bub',
              },
            },
            {
              name: {
                value: 'mum',
              },
            },
          ],
        },
      ],
    },
  },
}

/**
 * helpers
 */

const getPreviousSpeechOutput = attrs => ((attrs.lastSpeechOutput && attrs.history.length > 1) ? attrs.lastSpeechOutput : false)

const stripSpeak = str => (str.replace('<speak>', '').replace('</speak>', ''))

const getCustomIntents = () => model.interactionModel.languageModel.intents.filter(({ name }) => name.substring(0, 6) !== 'AMAZON').flatMap(({ samples }) => samples).filter(sample => !!sample)

const randomElement = myArray => myArray[Math.floor(Math.random() * myArray.length)]

const getPreviousIntent = attrs => ((attrs.history && attrs.history.length > 1) ? attrs.history[attrs.history.length - 2].IntentRequest : false)

const getSampleUtterance = intent => randomElement(intent.samples)

const getSlotValues = (filledSlots) => {
  const slotValues = {}

  Object.keys(filledSlots).forEach((item) => {
    const { name } = filledSlots[item]

    if (filledSlots[item]
      && filledSlots[item].resolutions
      && filledSlots[item].resolutions.resolutionsPerAuthority[0]
      && filledSlots[item].resolutions.resolutionsPerAuthority[0].status
      && filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
      switch (filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
        case 'ER_SUCCESS_MATCH':
          slotValues[name] = {
            heardAs: filledSlots[item].value,
            resolved: filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0].value.name,
            ERstatus: 'ER_SUCCESS_MATCH',
          }
          break
        case 'ER_SUCCESS_NO_MATCH':
          slotValues[name] = {
            heardAs: filledSlots[item].value,
            resolved: '',
            ERstatus: 'ER_SUCCESS_NO_MATCH',
          }
          break
        default:
          break
      }
    } else {
      slotValues[name] = {
        heardAs: filledSlots[item].value || '', // may be null
        resolved: '',
        ERstatus: '',
      }
    }
  }, this)

  return slotValues
}

const capitalize = myString => myString.replace(/(?:^|\s)\S/g, a => a.toUpperCase())

const welcomeCardImg = {
  smallImageUrl: 'https://s3.amazonaws.com/skill-images-789/cards/card_plane720_480.png',
  largeImageUrl: 'https://s3.amazonaws.com/skill-images-789/cards/card_plane1200_800.png',
}

/**
 * intent handlers
 */

const FallbackIntentHandler = {
  canHandle(handlerInput) {
    const { request } = JSON.parse(handlerInput.requestEnvelope.body)
    return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.FallbackIntent'
  },
  handle(handlerInput) {
    const { responseBuilder } = handlerInput
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    const previousSpeech = getPreviousSpeechOutput(sessionAttributes)
    return responseBuilder
      .speak(`Sorry I didnt catch what you said, ${stripSpeak(previousSpeech.outputSpeech)}`)
      .reprompt(stripSpeak(previousSpeech.reprompt))
      .getResponse()
  },
}

const CancelIntentHandler = {
  canHandle(handlerInput) {
    const { request } = JSON.parse(handlerInput.requestEnvelope.body)
    return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.CancelIntent'
  },
  handle(handlerInput) {
    const { responseBuilder } = handlerInput
    const say = 'Okay, talk to you later! '
    return responseBuilder
      .speak(say)
      .withShouldEndSession(true)
      .getResponse()
  },
}

const HelpIntentHandler = {
  canHandle(handlerInput) {
    const { request } = JSON.parse(handlerInput.requestEnvelope.body)
    return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.HelpIntent'
  },
  handle(handlerInput) {
    const { responseBuilder } = handlerInput
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    const intents = getCustomIntents()
    const sampleIntent = randomElement(intents)

    let say = 'You asked for help. '

    const previousIntent = getPreviousIntent(sessionAttributes)
    if (previousIntent && !JSON.parse(handlerInput.requestEnvelope.body).session.new) {
      say += `Your last intent was ${previousIntent}. `
    }

    say += ` Here is something you can ask me, ${getSampleUtterance(sampleIntent)}`

    return responseBuilder
      .speak(say)
      .reprompt(`try again, ${say}`)
      .getResponse()
  },
}

const StopIntentHandler = {
  canHandle(handlerInput) {
    const { request } = JSON.parse(handlerInput.requestEnvelope.body)
    return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.StopIntent'
  },
  handle(handlerInput) {
    const { responseBuilder } = handlerInput
    const say = 'Okay, talk to you later! '
    return responseBuilder
      .speak(say)
      .withShouldEndSession(true)
      .getResponse()
  },
}

const NavigateHomeIntentHandler = {
  canHandle(handlerInput) {
    const { request } = JSON.parse(handlerInput.requestEnvelope.body)
    return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.NavigateHomeIntent'
  },
  handle(handlerInput) {
    const { responseBuilder } = handlerInput
    const say = 'Hello from AMAZON.NavigateHomeIntent. '
    return responseBuilder
      .speak(say)
      .reprompt(`try again, ${say}`)
      .getResponse()
  },
}

const sayGoodnightHandler = {
  canHandle(handlerInput) {
    const { request } = JSON.parse(handlerInput.requestEnvelope.body)
    return request.type === 'IntentRequest' && request.intent.name === 'sayGoodnight'
  },
  handle(handlerInput) {
    const { request } = JSON.parse(handlerInput.requestEnvelope.body)
    const { responseBuilder } = handlerInput

    let say = 'Goodnight '
    let slotStatus = ''
    const slotValues = getSlotValues(request.intent.slots)

    if (slotValues.kiwi.heardAs && slotValues.kiwi.heardAs !== '') {
      slotStatus += slotValues.kiwi.heardAs
    } else {
      slotStatus += ' sleepy kiwi'
    }

    say += slotStatus

    return responseBuilder
      .speak(say)
      .reprompt(`try again, ${say}`)
      .getResponse()
  },
}

const NoIntentHandler = {
  canHandle(handlerInput) {
    const { request } = JSON.parse(handlerInput.requestEnvelope.body)
    return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.NoIntent'
  },
  handle(handlerInput) {
    const { responseBuilder } = handlerInput
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()

    let say = 'You said No. '
    const previousIntent = getPreviousIntent(sessionAttributes)

    if (previousIntent && !JSON.parse(handlerInput.requestEnvelope.body).session.new) {
      say += `Your last intent was ${previousIntent}. `
    }

    return responseBuilder
      .speak(say)
      .reprompt(`try again, ${say}`)
      .getResponse()
  },
}

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    const { request } = JSON.parse(handlerInput.requestEnvelope.body)
    return request.type === 'LaunchRequest'
  },
  handle(handlerInput) {
    const { responseBuilder } = handlerInput
    const say = `hello and welcome to ${invocationName}! Say help to hear some options.`
    const skillTitle = capitalize(invocationName)

    return responseBuilder
      .speak(say)
      .reprompt(`try again, ${say}`)
      .withStandardCard('Welcome!',
        `Hello!\nThis is a card for your skill, ${skillTitle}`,
        welcomeCardImg.smallImageUrl, welcomeCardImg.largeImageUrl)
      .getResponse()
  },
}

const SessionEndedHandler = {
  canHandle(handlerInput) {
    const { request } = JSON.parse(handlerInput.requestEnvelope.body)
    return request.type === 'SessionEndedRequest'
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${JSON.parse(handlerInput.requestEnvelope.body).request.reason}`)
    return handlerInput.responseBuilder.getResponse()
  },
}

const ErrorHandler = {
  canHandle() {
    return true
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`)

    return new Promise(resolve => Raven.captureException(
      error,
      () => resolve(handlerInput.responseBuilder
        .speak('Sorry, I can\'t understand the command. Please say again.')
        .reprompt('Sorry, I can\'t understand the command. Please say again.')
        .getResponse()),
    ))
  },
}

/**
 * main handler
 */

let skill

exports.handler = async (event, context) => {
  if (!skill) {
    skill = Alexa.SkillBuilders.custom()
      .addRequestHandlers(
        FallbackIntentHandler,
        CancelIntentHandler,
        HelpIntentHandler,
        StopIntentHandler,
        NavigateHomeIntentHandler,
        sayGoodnightHandler,
        NoIntentHandler,
        LaunchRequestHandler,
        SessionEndedHandler,
      )
      .addErrorHandlers(ErrorHandler)
      .create()
  }

  const response = await skill.invoke(event, context)

  return {
    statusCode: 200,
    body: JSON.stringify(response),
  }
}
