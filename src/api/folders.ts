import { supabase } from '../lib/supabase';
import { Folder } from '../types';

export async function fetchFolders(): Promise<Folder[]> {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error("Error fetching folders:", error);
    return [];
  }

  return data.map((folder: any) => ({
    id: folder.id,
    name: folder.name,
    validity: folder.validity,
    image: folder.image
  }));
}
