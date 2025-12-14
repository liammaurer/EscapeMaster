import { RoomSpec } from '../types';

export const mysteryOfficeRoom: RoomSpec = {
  id: 'mystery-office',
  name: 'The Mystery Office',
  description: 'You wake up in a dimly lit office. The door is locked and you must find a way out. The room smells of old books and dust.',
  difficulty: 'medium',
  
  rooms: [
    {
      id: 'office-main',
      name: 'Main Office',
      description: 'A cluttered office with a large wooden desk, a bookshelf against the wall, and a heavy metal door.',
      subAreas: [
        {
          id: 'desk-area',
          name: 'Desk Area',
          description: 'An antique wooden desk with drawers on both sides. Papers are scattered across the surface.',
          connectedTo: ['bookshelf-area', 'door-area'],
        },
        {
          id: 'bookshelf-area',
          name: 'Bookshelf',
          description: 'A tall oak bookshelf filled with dusty volumes. Some books look more worn than others.',
          connectedTo: ['desk-area', 'door-area'],
        },
        {
          id: 'door-area',
          name: 'Exit Door',
          description: 'A heavy metal door with an electronic keypad lock. A small red light indicates it is locked.',
          connectedTo: ['desk-area', 'bookshelf-area'],
        },
      ],
      initialSubArea: 'desk-area',
    },
  ],

  objects: [
    {
      id: 'desk',
      name: 'Wooden Desk',
      description: 'A large antique desk made of dark wood.',
      detailedDescription: 'The desk has three drawers on the left side. The top drawer has a small keyhole.',
      location: 'desk-area',
      visible: true,
      takeable: false,
      state: { topDrawerLocked: true, bottomDrawersOpen: false },
      affordances: [],
      hiddenDetails: ['You notice scratch marks near the top drawer lock.'],
      containedObjects: ['desk-drawer'],
    },
    {
      id: 'desk-drawer',
      name: 'Desk Drawer',
      description: 'The top drawer of the desk.',
      detailedDescription: 'A locked drawer. You can see something glinting inside through a small gap.',
      location: 'desk-area',
      visible: false,
      takeable: false,
      state: { locked: true },
      affordances: [
        {
          action: 'USE',
          requires: ['brass-key'],
          changes: { locked: false },
          reveals: ['note-paper'],
          message: 'You unlock the drawer with the brass key. Inside you find a folded piece of paper.',
        },
      ],
      containedObjects: ['note-paper'],
    },
    {
      id: 'brass-key',
      name: 'Brass Key',
      description: 'A small brass key with ornate engravings.',
      location: 'bookshelf-area',
      visible: false,
      takeable: true,
      state: {},
      affordances: [],
      hiddenDetails: ['The engravings show the initials "J.M."'],
    },
    {
      id: 'note-paper',
      name: 'Folded Note',
      description: 'A piece of yellowed paper with writing on it.',
      detailedDescription: 'The note reads: "The door code is hidden where knowledge sleeps. Count the red spines - that is your first digit. The year I was born minus 1900 gives you the rest. - J.M. (born 1947)"',
      location: 'desk-drawer',
      visible: false,
      takeable: true,
      state: {},
      affordances: [],
      hiddenDetails: ['At the bottom in tiny writing: "Red books: 3"'],
    },
    {
      id: 'bookshelf-obj',
      name: 'Bookshelf',
      description: 'A tall bookshelf with many old books.',
      detailedDescription: 'The bookshelf contains dozens of books. You notice 3 books with red spines standing out among the others. One book titled "Hidden Secrets" seems slightly pulled out.',
      location: 'bookshelf-area',
      visible: true,
      takeable: false,
      state: {},
      affordances: [
        {
          action: 'USE',
          message: 'You examine the books more closely.',
          reveals: ['brass-key'],
        },
      ],
      hiddenDetails: ['Behind "Hidden Secrets" you spot a small brass key wedged between the books.'],
    },
    {
      id: 'keypad',
      name: 'Door Keypad',
      description: 'An electronic keypad with numbers 0-9.',
      detailedDescription: 'A standard numeric keypad. It requires a 4-digit code. The display shows "----".',
      location: 'door-area',
      visible: true,
      takeable: false,
      state: { locked: true },
      affordances: [],
      hiddenDetails: ['Small text below reads: "3 attempts remaining"'],
    },
  ],

  puzzles: [
    {
      id: 'door-code',
      name: 'Door Keypad',
      description: 'Enter the correct 4-digit code to unlock the door.',
      type: 'code',
      solution: '347',
      prerequisites: [],
      clues: [
        { id: 'clue-red-books', text: 'Count the red spines for the first digit', revealedBy: 'inspect-note', revealed: false },
        { id: 'clue-birth-year', text: 'J.M. was born in 1947', revealedBy: 'inspect-note', revealed: false },
      ],
      maxAttempts: 3,
      attempts: 0,
      solved: false,
      onSolve: {
        message: 'CLICK! The keypad beeps and the door swings open. Freedom awaits!',
        milestonePoints: 50,
      },
      onFail: {
        message: 'BZZT! Wrong code.',
        consequence: 'none',
      },
    },
  ],

  mediaAssets: [],
  
  escapeCondition: {
    description: 'Unlock and open the exit door',
    requirements: ['door-code'],
  },
  
  initialLocation: 'desk-area',
  inventoryCapacity: 10,
};

