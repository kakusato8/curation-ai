// Utility functions for handling various Firestore timestamp formats

export interface FirestoreTimestamp {
  _seconds?: number;
  _nanoseconds?: number;
  seconds?: number;
  nanoseconds?: number;
  toDate?: () => Date;
}

/**
 * Robust date parsing function that handles various Firestore timestamp formats
 * including underscore-prefixed formats from different serialization layers
 */
export const parseFirestoreDate = (dateString: string | Date | FirestoreTimestamp | any): Date | null => {
  if (!dateString) {
    return null;
  }

  try {
    // Handle various Firestore timestamp formats
    if (typeof dateString === 'object') {
      // Handle underscore-prefixed Firestore timestamp: {_seconds: 1754595741, _nanoseconds: 400000000}
      if (dateString._seconds !== undefined) {
        return new Date(dateString._seconds * 1000 + (dateString._nanoseconds || 0) / 1000000);
      }
      // Handle standard Firestore timestamp: {seconds: 1754595741, nanoseconds: 400000000}
      else if (dateString.seconds !== undefined) {
        return new Date(dateString.seconds * 1000 + (dateString.nanoseconds || 0) / 1000000);
      }
      // Handle if it's already a Date object
      else if (dateString instanceof Date) {
        return dateString;
      }
      // Handle Firebase Timestamp objects with toDate method
      else if (typeof dateString.toDate === 'function') {
        return dateString.toDate();
      }
      // Try to convert object to date as fallback
      else {
        return new Date(dateString);
      }
    } else {
      // Handle string or number formats
      return new Date(dateString);
    }
  } catch (error) {
    console.error('Error parsing Firestore date:', error, 'Input:', dateString);
    return null;
  }
};

/**
 * Format a Firestore date to Japanese locale string
 */
export const formatDate = (dateString: string | Date | FirestoreTimestamp | any): string => {
  const date = parseFirestoreDate(dateString);
  
  if (!date || isNaN(date.getTime())) {
    console.warn('Invalid date string:', dateString);
    return '不正な日時';
  }
  
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format a simple date string (e.g., for basic components)
 */
export const formatSimpleDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '不正な日時';
    }
    
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting simple date:', error);
    return '日時エラー';
  }
};

/**
 * Get a group label for dates (今日, 昨日, etc.)
 */
export const getDateGroupLabel = (dateString: string | Date | FirestoreTimestamp | any): string => {
  const date = parseFirestoreDate(dateString);
  
  if (!date || isNaN(date.getTime())) {
    return '不正な日付';
  }
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (itemDate.getTime() === today.getTime()) {
    return '今日';
  } else if (itemDate.getTime() === yesterday.getTime()) {
    return '昨日';
  } else if (itemDate >= weekAgo) {
    return '今週';
  } else if (itemDate >= monthAgo) {
    return '今月';
  } else {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}年${month}月`;
  }
};

/**
 * Get a specific date key for exact date grouping (YYYY-MM-DD format)
 */
export const getDateKey = (dateString: string | Date | FirestoreTimestamp | any): string => {
  const date = parseFirestoreDate(dateString);
  
  if (!date || isNaN(date.getTime())) {
    return 'invalid-date';
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Format date key to readable Japanese date
 */
export const formatDateKey = (dateKey: string): string => {
  if (dateKey === 'invalid-date') {
    return '不正な日付';
  }
  
  try {
    const [year, month, day] = dateKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    if (date.getTime() === today.getTime()) {
      return `今日 (${year}年${parseInt(month)}月${parseInt(day)}日)`;
    } else if (date.getTime() === yesterday.getTime()) {
      return `昨日 (${year}年${parseInt(month)}月${parseInt(day)}日)`;
    } else {
      return `${year}年${parseInt(month)}月${parseInt(day)}日`;
    }
  } catch (error) {
    return '日付エラー';
  }
};