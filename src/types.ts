export type StageId = 'ks1' | 'ks2' | 'ks3' | 'higher'

export interface Stage {
  id: StageId
  name: string
  ages: string
  blurb: string
  emoji: string
}

export interface Question {
  prompt: string
  choices: string[]
  /** Index into `choices` of the correct answer. */
  answer: number
  hint: string
}
