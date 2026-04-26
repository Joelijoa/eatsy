import { useEffect, useState } from 'react';
import * as Updates from 'expo-updates';

export const useUpdateCheck = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (__DEV__) return; // expo-updates ne fonctionne pas en développement
    Updates.checkForUpdateAsync()
      .then((result) => { if (result.isAvailable) setUpdateAvailable(true); })
      .catch(() => {});
  }, []);

  return { updateAvailable };
};
