/* eslint-disable no-case-declarations,no-confusing-arrow */
import _ from 'lodash';
import Realm from 'realm';

const quotesData = require('./data');

const QuoteSchema = {
  name: 'Quote',
  properties: {
    quote: 'string',
    author: 'string',
    displayedTimes: { type: 'int', default: 0 },
    bookmarked: { type: 'bool', default: false },
    id: 'int',
    category: 'string',
  },
};

export const BG_TYPES = {
  BG_WHITE: 'BG_WHITE',
  BG_BLACK: 'BG_BLACK',
  BG_RANDOM: 'BG_RANDOM',
};

const initialState = {
  quotesLoaded: false,
  currentQuote: null,
  isDarkBg: false,
  bgType: BG_TYPES.BG_RANDOM,
  showFavorites: false,
  categories: {
    inspire: true,
    management: false,
    sports: false,
    life: false,
    funny: false,
    love: false,
    art: false,
    students: false,
  },
};

export const LOAD_QUOTES = 'QuotesState/LOAD_QUOTES';
export const NEXT_QUOTE = 'QuotesState/NEXT_QUOTE';
export const TOGGLE_BOOKMARK = 'QuotesState/TOGGLE_BOOKMARK';
export const CHANGE_BG_TYPE = 'QuotesState/CHANGE_BG_TYPE';
export const TOGGLE_CATEGORY = 'QuotesState/TOGGLE_CATEGORY';
export const TOGGLE_FAVORITES = 'QuotesState/TOGGLE_FAVORITES';
export const SELECT_ALL_CATEGORIES = 'QuotesState/SELECT_ALL_CATEGORIES';

/**
 * Initial quotes loading into the redux store
 * @returns {Function} Dispatches LOAD_QUOTES action with new quotes
 */
export function loadQuotes() {
  return (dispatch) => {
    Realm.open({ schema: [QuoteSchema] })
      .then((realm) => {
        realm.write(() => {
          quotesData.quotes.forEach((quote, index) => {
            realm.create('Quote', {
              ...quote,
              author: quote.author || 'Unknown',
              displayedTimes: 0,
              bookmarked: false,
              id: index,
            });
          });
        });

        dispatch({
          type: LOAD_QUOTES,
        });
      })
      .catch((e) => {
        console.log(e);
      });
  };
}

/**
 * Choosing the next quote for displaying.
 * @returns {Function} Dispatches NEXT_QUOTE action with the new quote
 */
export function newQuote() {
  return (dispatch, getState) => {
    const state = getState();

    Realm.open({ schema: [QuoteSchema] })
      .then((realm) => {
        const quotes = realm.objects('Quote');
        let filterExpression = Object.keys(state.quotes.categories)
          .reduce((accumulator, currentValue) => {
            if (state.quotes.categories[currentValue]) {
              if (accumulator.length === 0) {
                return `category = "${currentValue}"`;
              }
              return `${accumulator} OR category = "${currentValue}"`;
            }
            return accumulator;
          }, '');

        if (state.quotes.showFavorites) {
          filterExpression += ' AND bookmarked = true';
        }

        const nextQuote = quotes.filtered(filterExpression).sorted('displayedTimes')[0];

        realm.write(() => {
          nextQuote.displayedTimes += 1;

          dispatch({
            type: NEXT_QUOTE,
            payload: {
              nextQuote: JSON.parse(JSON.stringify(nextQuote)),
              index: nextQuote.id,
            },
          });
        });

        realm.close();
      });
  };
}

export function changeBgType(newBgType) {
  return {
    type: CHANGE_BG_TYPE,
    payload: newBgType,
  };
}

export function toggleBookmark(quoteToBookmark) {
  return (dispatch) => {
    dispatch({
      type: TOGGLE_BOOKMARK,
    });
    Realm.open({ schema: [QuoteSchema] })
      .then((realm) => {
        const quote = realm.objects('Quote').filtered(`id = ${quoteToBookmark.id}`)[0];
        realm.write(() => {
          quote.bookmarked = !quote.bookmarked;
        });

        realm.close();
      });
  };
}

export function toggleCategory(category) {
  return {
    type: TOGGLE_CATEGORY,
    payload: category,
  };
}

export function selectAllCategories() {
  return {
    type: SELECT_ALL_CATEGORIES,
  };
}

export function toggleFavorites() {
  return {
    type: TOGGLE_FAVORITES,
  };
}

export default function QuotesReducer(state = initialState, action) {
  switch (action.type) {
    case LOAD_QUOTES:
      return {
        ...state,
        quotesLoaded: true,
      };
    case NEXT_QUOTE:
      return {
        ...state,
        currentQuote: action.payload.nextQuote,
        isDarkBg: state.bgType === BG_TYPES.BG_RANDOM ? !!_.random(0, 1) : state.isDarkBg,
      };
    case TOGGLE_BOOKMARK:
      return {
        ...state,
        currentQuote: {
          ...state.currentQuote,
          bookmarked: !state.currentQuote.bookmarked,
        },
      };
    case CHANGE_BG_TYPE:
      return {
        ...state,
        bgType: action.payload,
        // eslint-disable-next-line no-nested-ternary
        isDarkBg: action.payload === BG_TYPES.BG_WHITE ? false :
          (action.payload === BG_TYPES.BG_RANDOM ? state.isDarkBg : true),
      };
    case TOGGLE_CATEGORY:
      return {
        ...state,
        categories: {
          ...state.categories,
          [action.payload]: !state.categories[action.payload],
        },
      };
    case SELECT_ALL_CATEGORIES:
      return {
        ...state,
        categories: {
          inspire: true,
          management: true,
          sports: true,
          life: true,
          funny: true,
          love: true,
          art: true,
          students: true,
        },
      };
    case TOGGLE_FAVORITES:
      return {
        ...state,
        showFavorites: !state.showFavorites,
      };
    default:
      return state;
  }
}
