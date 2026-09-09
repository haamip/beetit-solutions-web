export type ServiceDetail = {
  slug: string
  name: string
  summary: string
  intro: string
  helpWith: readonly string[]
  approach: readonly string[]
}

export const serviceDetails: readonly ServiceDetail[] = [
  {
    slug: 'cultural-impact-assessments',
    name: 'Cultural Impact Assessments',
    summary: 'Independent cultural impact assessment support and reporting for relevant projects and processes.',
    intro: 'Support for organisations, projects and communities that need cultural considerations identified, understood and communicated clearly.',
    helpWith: ['Scoping the cultural matters relevant to a project', 'Engagement and information gathering', 'Clear written assessment and practical recommendations'],
    approach: ['Start with the purpose, people and place involved', 'Identify the information and engagement needed', 'Prepare a clear, usable assessment suited to the process'],
  },
  {
    slug: 'employment-advocacy',
    name: 'Employment Advocacy',
    summary: 'Practical support with employment matters, workplace issues, correspondence and advocacy.',
    intro: 'Straightforward support to help employees understand their options, prepare for conversations and respond to workplace issues.',
    helpWith: ['Employment concerns and workplace disputes', 'Meetings, correspondence and response preparation', 'Understanding next steps and available options'],
    approach: ['Review what has happened and the documents available', 'Identify the key issues and desired outcome', 'Prepare a practical way forward and provide advocacy where agreed'],
  },
  {
    slug: 'maori-land-court-support',
    name: 'Māori Land Court Support',
    summary: 'Assistance understanding processes, preparing information and navigating Māori Land Court matters.',
    intro: 'Practical assistance for whānau who need help understanding a Māori Land Court process and organising the information required.',
    helpWith: ['Understanding forms, correspondence and process steps', 'Preparing and organising supporting information', 'Planning for meetings, hearings or next steps'],
    approach: ['Clarify the matter and where it is up to', 'Work through the information and documents available', 'Help prepare a clear, organised response or next step'],
  },
  {
    slug: 'governance-and-compliance',
    name: 'Governance and Compliance',
    summary: 'Support for governance responsibilities, policy, compliance and decision making.',
    intro: 'Support for boards, trusts and organisations that want clear governance processes, practical policies and better decision making.',
    helpWith: ['Governance processes and responsibilities', 'Policy and procedure review', 'Meeting, decision and compliance support'],
    approach: ['Understand the organisation and the issue to be addressed', 'Review the current documents and process', 'Provide clear recommendations and practical improvements'],
  },
  {
    slug: 'elderly-care-advocacy',
    name: 'Elderly Care Advocacy',
    summary: 'Advocacy and support for older people and whānau navigating care, services and important decisions.',
    intro: 'Support for older people and their whānau when care arrangements, services or important decisions are becoming difficult to navigate.',
    helpWith: ['Preparing for meetings and discussions with providers', 'Helping whānau organise concerns and questions', 'Advocacy around care, communication and practical next steps'],
    approach: ['Listen to the person and whānau involved', 'Clarify the immediate concerns and desired outcome', 'Prepare for discussions and advocate where agreed'],
  },
  {
    slug: 'insurance-claims-assistance',
    name: 'Insurance Claims Assistance',
    summary: 'Help understanding, preparing and progressing insurance claims and related correspondence.',
    intro: 'Practical support for people who need help understanding an insurance claim, organising information and communicating clearly with an insurer.',
    helpWith: ['Reviewing claim correspondence and requirements', 'Organising supporting information', 'Preparing responses, questions and follow up'],
    approach: ['Review the policy information and claim history available', 'Identify what is outstanding or unclear', 'Prepare an organised response and next steps'],
  },
  {
    slug: 'te-tiriti-treaty-research-advisory',
    name: 'Te Tiriti and Treaty Research and Advisory',
    summary: 'Research and advisory support relating to Te Tiriti o Waitangi and Treaty matters.',
    intro: 'Research and advisory support where a matter requires careful consideration of Te Tiriti o Waitangi, Treaty context, history or related obligations.',
    helpWith: ['Targeted research and background review', 'Advice on relevant Te Tiriti or Treaty considerations', 'Clear written material for decision making or engagement'],
    approach: ['Define the question and purpose of the work', 'Review the relevant sources and context', 'Provide clear findings and practical advisory support'],
  },
]

export const bookingServiceNames = [...serviceDetails.map((service) => service.name), 'Other / Not sure'] as const

export function getServiceBySlug(slug: string) {
  return serviceDetails.find((service) => service.slug === slug)
}
