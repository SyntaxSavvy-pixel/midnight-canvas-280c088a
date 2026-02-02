/**
 * useNotes Hook - Notes management with localStorage and Supabase sync
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'tabkeep_notes';

export const useNotes = (userId?: string) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load notes from localStorage or Supabase
  useEffect(() => {
    const loadNotes = async () => {
      setIsLoading(true);

      if (userId && supabase) {
        // Logged in user - load from Supabase
        try {
          const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

          if (!error && data) {
            setNotes(data.map(n => ({
              id: n.id,
              title: n.title,
              content: n.content,
              createdAt: n.created_at,
              updatedAt: n.updated_at,
            })));
          }
        } catch (e) {
          console.error('Failed to load notes from Supabase:', e);
          // Fall back to localStorage
          loadFromLocalStorage();
        }
      } else {
        // Guest - load from localStorage
        loadFromLocalStorage();
      }

      setIsLoading(false);
    };

    const loadFromLocalStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setNotes(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load notes from localStorage:', e);
      }
    };

    loadNotes();
  }, [userId]);

  // Save to localStorage (for guests or as backup)
  const saveToLocalStorage = useCallback((notesToSave: Note[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notesToSave));
    } catch (e) {
      console.error('Failed to save notes to localStorage:', e);
    }
  }, []);

  // Create a new note
  const createNote = useCallback(async (title: string = 'Untitled Note', content: string = '') => {
    const now = new Date().toISOString();
    const newNote: Note = {
      id: crypto.randomUUID(),
      title,
      content,
      createdAt: now,
      updatedAt: now,
    };

    if (userId && supabase) {
      try {
        const { error } = await supabase.from('notes').insert({
          id: newNote.id,
          user_id: userId,
          title: newNote.title,
          content: newNote.content,
          created_at: newNote.createdAt,
          updated_at: newNote.updatedAt,
        });

        if (error) throw error;
      } catch (e) {
        console.error('Failed to save note to Supabase:', e);
      }
    }

    const updated = [newNote, ...notes];
    setNotes(updated);
    saveToLocalStorage(updated);

    return newNote;
  }, [notes, userId, saveToLocalStorage]);

  // Update a note
  const updateNote = useCallback(async (id: string, updates: Partial<Pick<Note, 'title' | 'content'>>) => {
    const now = new Date().toISOString();

    const updated = notes.map(note =>
      note.id === id
        ? { ...note, ...updates, updatedAt: now }
        : note
    );

    setNotes(updated);
    saveToLocalStorage(updated);

    if (userId && supabase) {
      try {
        await supabase.from('notes').update({
          ...updates,
          updated_at: now,
        }).eq('id', id).eq('user_id', userId);
      } catch (e) {
        console.error('Failed to update note in Supabase:', e);
      }
    }
  }, [notes, userId, saveToLocalStorage]);

  // Delete a note
  const deleteNote = useCallback(async (id: string) => {
    const updated = notes.filter(note => note.id !== id);
    setNotes(updated);
    saveToLocalStorage(updated);

    if (userId && supabase) {
      try {
        await supabase.from('notes').delete().eq('id', id).eq('user_id', userId);
      } catch (e) {
        console.error('Failed to delete note from Supabase:', e);
      }
    }
  }, [notes, userId, saveToLocalStorage]);

  // Get a single note by ID
  const getNote = useCallback((id: string) => {
    return notes.find(note => note.id === id);
  }, [notes]);

  return {
    notes,
    isLoading,
    createNote,
    updateNote,
    deleteNote,
    getNote,
  };
};
