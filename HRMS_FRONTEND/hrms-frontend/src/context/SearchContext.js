import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SearchContext = createContext({ query: '', setQuery: () => {} });

export function SearchProvider({ children }) {
  const [query, setQuery] = useState('');
  const location = useLocation();

  // Reset search whenever the route changes
  useEffect(() => { setQuery(''); }, [location.pathname]);

  return (
    <SearchContext.Provider value={{ query, setQuery }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearchContext() {
  return useContext(SearchContext);
}
