import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../services/api';

function useDepartments(includeInactive = false) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  const reload = useCallback(() => {
    setRefresh((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDepartments() {
      setLoading(true);
      setError('');

      try {
        const data = await apiRequest(
          `/departments?include_inactive=${includeInactive ? 1 : 0}`
        );

        if (!cancelled) {
          setDepartments(data.departments);
        }
      } catch (err) {
        if (!cancelled) {
          setDepartments([]);
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDepartments();

    return () => {
      cancelled = true;
    };
  }, [includeInactive, refresh]);

  return { departments, loading, error, reload };
}

export default useDepartments;