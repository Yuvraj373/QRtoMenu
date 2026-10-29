import { useEffect, useMemo, useState } from 'react';
import api, { errorMessage } from '../lib/api';
import { groupByCategory, formatPrice, categoryIcon } from '../lib/menu';
import AdminLayout from '../Components/AdminLayout';
import ItemForm from '../Components/ItemForm';
import ConfirmDialog from '../Components/ConfirmDialog';
import SearchBar from '../Components/SearchBar';
import VegMark from '../Components/VegMark';
import { useToast } from '../Components/Toast';
import { EditIcon, PlusIcon, RefreshIcon, StarIcon, TrashIcon } from '../Components/Icons';

function Stat({ label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 px-4 py-3 sm:px-5 sm:py-4">
      <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-stone-400">{label}</p>
      <p className="mt-1 text-xl sm:text-2xl font-extrabold tabular-nums text-stone-900">{value}</p>
    </div>
  );
}

function Thumb({ item }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-stone-100 grid place-items-center text-2xl">
      {item.image && !failed ? (
        <img src={item.image} alt="" loading="lazy" onError={() => setFailed(true)} className="w-full h-full object-cover" />
      ) : (
        categoryIcon(item.category)
      )}
    </div>
  );
}

export default function Admin() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setStatus('loading');
    api
      .get('/items')
      .then((res) => {
        setItems(res.data);
        setStatus('ready');
      })
      .catch((err) => {
        toast(errorMessage(err), 'error');
        setStatus('error');
      });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  // Lock background scroll while the mobile sheet is open
  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 1023px)').matches;
    document.body.style.overflow = formOpen && mobile ? 'hidden' : '';
    return () => (document.body.style.overflow = '');
  }, [formOpen]);

  const categories = useMemo(() => [...new Set(items.map((i) => i.category))], [items]);

  const sections = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groupByCategory(q ? items.filter((i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)) : items);
  }, [items, search]);

  const openNew = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormOpen(true);
    if (window.matchMedia('(min-width: 1024px)').matches) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => {
    setEditingItem(null);
    setFormOpen(false);
  };

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (editingItem) {
        const res = await api.put(`/items/${editingItem._id}`, data);
        setItems((list) => list.map((i) => (i._id === res.data._id ? res.data : i)));
        toast('Item updated');
        closeForm();
      } else {
        const res = await api.post('/items', data);
        setItems((list) => [...list, res.data]);
        toast(`“${res.data.name}” added`);
      }
      return true;
    } catch (err) {
      toast(errorMessage(err), 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailable = async (item) => {
    const next = !(item.isAvailable ?? true);
    setItems((list) => list.map((i) => (i._id === item._id ? { ...i, isAvailable: next } : i)));
    try {
      await api.put(`/items/${item._id}`, { isAvailable: next });
    } catch (err) {
      setItems((list) => list.map((i) => (i._id === item._id ? { ...i, isAvailable: !next } : i)));
      toast(errorMessage(err), 'error');
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/items/${toDelete._id}`);
      setItems((list) => list.filter((i) => i._id !== toDelete._id));
      if (editingItem?._id === toDelete._id) closeForm();
      toast('Item deleted');
      setToDelete(null);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout
      title="Menu Items"
      subtitle="Add, edit and manage your menu items"
      actions={
        <button onClick={openNew} className="lg:hidden inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-brand text-white text-sm font-bold shadow-lg shadow-brand/30 active:scale-95 transition">
          <PlusIcon className="w-4 h-4" /> Add item
        </button>
      }
    >
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Items" value={items.length} />
        <Stat label="Categories" value={categories.length} />
        <Stat label="Specials" value={items.filter((i) => i.isSpecial).length} />
      </div>

      <div className="lg:grid lg:grid-cols-[1fr_400px] lg:gap-6 lg:items-start">
        {/* Item list */}
        <section className="min-w-0">
          <SearchBar value={search} onChange={setSearch} placeholder="Search items or categories…" className="mb-4" />

          {status === 'loading' && (
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-12 bg-white rounded-2xl border border-stone-200">
              <p className="text-sm text-stone-500">Couldn't load items.</p>
              <button onClick={load} className="mt-4 inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-stone-900 text-white text-sm font-bold">
                <RefreshIcon className="w-4 h-4" /> Retry
              </button>
            </div>
          )}

          {status === 'ready' && sections.length === 0 && (
            <div className="text-center py-14 bg-white rounded-2xl border border-dashed border-stone-300">
              <div className="text-4xl">🍽️</div>
              <p className="mt-3 font-bold text-stone-900">{items.length ? 'No matching items' : 'No items yet'}</p>
              <p className="text-sm text-stone-500">{items.length ? 'Try a different search.' : 'Add your first item.'}</p>
            </div>
          )}

          <div className="space-y-6">
            {sections.map((s) => (
              <div key={s.id}>
                <h3 className="flex items-center gap-2 mb-2 px-1 text-sm font-extrabold text-stone-700">
                  <span>{s.icon}</span> {s.category}
                  <span className="text-stone-400 font-semibold">· {s.items.length}</span>
                </h3>
                <ul className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 overflow-hidden">
                  {s.items.map((item) => {
                    const available = item.isAvailable ?? true;
                    return (
                      <li key={item._id} className={`flex items-center gap-3 p-3 sm:p-4 transition ${editingItem?._id === item._id ? 'bg-brand/5' : 'hover:bg-stone-50'}`}>
                        <Thumb item={item} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <VegMark isVeg={item.isVeg} />
                            <p className={`font-bold text-sm truncate ${available ? 'text-stone-900' : 'text-stone-400 line-through'}`}>{item.name}</p>
                            {item.isSpecial && <StarIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                          </div>
                          <p className="mt-1 text-xs text-stone-500 tabular-nums">
                            {item.priceL != null ? <>M {formatPrice(item.priceM)} · L {formatPrice(item.priceL)}</> : formatPrice(item.priceM)}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleAvailable(item)}
                          title={available ? 'Mark sold out' : 'Mark available'}
                          className={`hidden sm:inline-flex h-8 px-3 rounded-full text-[11px] font-bold uppercase tracking-wide transition ${
                            available ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                          } items-center`}
                        >
                          {available ? 'In stock' : 'Sold out'}
                        </button>
                        <div className="flex gap-1.5">
                          <button onClick={() => openEdit(item)} aria-label={`Edit ${item.name}`} className="grid place-items-center w-10 h-10 rounded-xl text-stone-600 bg-stone-100 hover:bg-stone-200 transition">
                            <EditIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => setToDelete(item)} aria-label={`Delete ${item.name}`} className="grid place-items-center w-10 h-10 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 transition">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Form: bottom sheet on phones/tablets, sticky side panel on desktop */}
        <div className={`${formOpen ? 'fixed' : 'hidden'} inset-0 z-40 flex items-end sm:items-center justify-center sm:p-4 lg:flex lg:p-0 lg:sticky lg:inset-auto lg:top-24 lg:z-auto`}>
          <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-[2px] lg:hidden" onClick={closeForm} />
          <div className="relative w-full sm:max-w-lg lg:max-w-none max-h-[92dvh] lg:max-h-[calc(100dvh-7rem)] bg-white rounded-t-3xl sm:rounded-3xl lg:rounded-2xl border border-stone-200 shadow-2xl lg:shadow-sm flex flex-col overflow-hidden animate-sheet-up sm:animate-fade-up lg:animate-none">
            <div className="sm:hidden mx-auto mt-2.5 w-10 h-1.5 rounded-full bg-stone-300" />
            <ItemForm key={editingItem?._id || 'new'} editingItem={editingItem} categories={categories} onSave={handleSave} onClose={closeForm} saving={saving} />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete item?"
        message={toDelete ? `“${toDelete.name}” will be permanently removed from the menu.` : ''}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
        busy={deleting}
      />
    </AdminLayout>
  );
}
