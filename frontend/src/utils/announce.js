/**
 * Spoken announcements for the waiting-room display board.
 *
 * Browsers refuse to make any sound until the page has been interacted with,
 * so nothing here runs until the "Start display" button has been pressed.
 */

// A token number must be read out character by character: "OPD-042" is
// "O P D, zero four two", never "opd forty-two".
const ENGLISH_CHARACTERS = {
  0: 'zero',
  1: 'one',
  2: 'two',
  3: 'three',
  4: 'four',
  5: 'five',
  6: 'six',
  7: 'seven',
  8: 'eight',
  9: 'nine',
}

// Devanagari spellings, so the Hindi announcement does not depend on a Hindi
// voice guessing its way through Latin text
const HINDI_CHARACTERS = {
  A: 'ए',
  B: 'बी',
  C: 'सी',
  D: 'डी',
  E: 'ई',
  F: 'एफ',
  G: 'जी',
  H: 'एच',
  I: 'आई',
  J: 'जे',
  K: 'के',
  L: 'एल',
  M: 'एम',
  N: 'एन',
  O: 'ओ',
  P: 'पी',
  Q: 'क्यू',
  R: 'आर',
  S: 'एस',
  T: 'टी',
  U: 'यू',
  V: 'वी',
  W: 'डब्ल्यू',
  X: 'एक्स',
  Y: 'वाई',
  Z: 'ज़ेड',
  0: 'शून्य',
  1: 'एक',
  2: 'दो',
  3: 'तीन',
  4: 'चार',
  5: 'पाँच',
  6: 'छह',
  7: 'सात',
  8: 'आठ',
  9: 'नौ',
}

const spell = (tokenNumber, table, { keepLetters }) =>
  String(tokenNumber || '')
    .toUpperCase()
    .split('')
    .map((character) => {
      if (table[character]) return table[character]
      if (character === '-' || character === ' ') return ','
      // A–Z are read out as letters by an English voice as they are
      return keepLetters && /[A-Z]/.test(character) ? character : ''
    })
    .filter(Boolean)
    .join(' ')
    .replace(/\s+,/g, ',')

/** The two sentences to speak for a token, in order */
export const buildAnnouncements = (tokenNumber, departmentName) => {
  const english = spell(tokenNumber, ENGLISH_CHARACTERS, { keepLetters: true })
  const hindi = spell(tokenNumber, HINDI_CHARACTERS, { keepLetters: false })
  const destination = departmentName ? departmentName : 'the counter'

  return {
    // The department is named in English only; a Hindi voice handed an English
    // department name mangles it, so the Hindi line stays generic
    english: `Token ${english}. Please proceed to ${destination}.`,
    hindi: `टोकन ${hindi}. कृपया काउंटर पर जाएँ।`,
  }
}

export const isSpeechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

const findVoice = (languagePrefix) => {
  if (!isSpeechSupported()) return null

  const voices = window.speechSynthesis.getVoices() || []

  return voices.find((voice) => voice.lang?.toLowerCase().startsWith(languagePrefix)) || null
}

export const hasHindiVoice = () => Boolean(findVoice('hi'))

/**
 * A short two-note chime, so a patient looks up before the words start.
 * Resolves once it has finished, to keep speech from talking over it.
 */
export const playChime = async (audioContext) => {
  if (!audioContext) return

  if (audioContext.state === 'suspended') await audioContext.resume()

  const startedAt = audioContext.currentTime

  // Two soft sine notes a fifth apart: noticeable without being alarming
  ;[
    { frequency: 880, offset: 0 },
    { frequency: 1318.5, offset: 0.18 },
  ].forEach(({ frequency, offset }) => {
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    oscillator.connect(gain)
    gain.connect(audioContext.destination)

    const noteStart = startedAt + offset
    gain.gain.setValueAtTime(0, noteStart)
    gain.gain.linearRampToValueAtTime(0.25, noteStart + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.45)

    oscillator.start(noteStart)
    oscillator.stop(noteStart + 0.5)
  })

  await new Promise((resolve) => setTimeout(resolve, 700))
}

/** Speaks one sentence, resolving when it ends (or is cut short) */
const speak = (text, { lang, voice }) =>
  new Promise((resolve) => {
    if (!isSpeechSupported() || !text) return resolve()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    if (voice) utterance.voice = voice
    // A waiting room is noisy; slower speech carries better
    utterance.rate = 0.85

    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }

    utterance.onend = finish
    utterance.onerror = finish
    // Some browsers never fire onend for a cancelled utterance
    setTimeout(finish, 15000)

    window.speechSynthesis.speak(utterance)
  })

/** Stops anything mid-sentence — a newer token supersedes an older one */
export const cancelAnnouncements = () => {
  if (isSpeechSupported()) window.speechSynthesis.cancel()
}

/**
 * Unlocks audio from inside a click handler, and gives the browser a moment to
 * populate its voice list (which is empty until first use in some browsers).
 */
export const primeSpeech = () => {
  if (!isSpeechSupported()) return

  window.speechSynthesis.getVoices()
  window.speechSynthesis.cancel()
}

/**
 * Chime, then English, then Hindi.
 *
 * @returns {Promise<{spokenHindi: Boolean}>} whether a Hindi voice existed
 */
export const announceToken = async ({ tokenNumber, departmentName, audioContext }) => {
  const { english, hindi } = buildAnnouncements(tokenNumber, departmentName)

  await playChime(audioContext)
  await speak(english, { lang: 'en-IN', voice: findVoice('en-in') || findVoice('en') })

  const hindiVoice = findVoice('hi')

  // Without a Hindi voice installed, an English one reading Devanagari is
  // worse than silence
  if (hindiVoice) {
    await speak(hindi, { lang: 'hi-IN', voice: hindiVoice })
  }

  return { spokenHindi: Boolean(hindiVoice) }
}
