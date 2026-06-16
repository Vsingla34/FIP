import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';

export default function AvatarUpload() {
  const { user, profile, updateProfile } = useAuth();
  const { showToast } = useApp();

  const [uploading, setUploading] = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [showMenu,  setShowMenu]  = useState(false);
  const fileInputRef = useRef(null);

  const avatarUrl   = profile?.avatar_url || null;
  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'FIP Member';
  const initials    = displayName
    .split(' ').filter(w => w.length > 1).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  /* ── UPLOAD ── */
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate size — 5MB
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB.', true);
      return;
    }

    setUploading(true);
    setShowMenu(false);

    try {
      // Always use .jpg extension regardless of input
      // so we always overwrite the same file path
      const ext      = file.name.split('.').pop().toLowerCase() || 'jpg';
      const filePath = `${user.id}/avatar.${ext}`;

      console.log('Uploading to path:', filePath);
      console.log('File type:', file.type, 'Size:', file.size);

      // Upload — upsert:true replaces existing file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert:      true,
          contentType: file.type,
          cacheControl: '0',
        });

      if (uploadError) {
        console.error('Supabase upload error:', JSON.stringify(uploadError, null, 2));
        throw new Error(uploadError.message || 'Upload failed');
      }

      console.log('Upload success:', uploadData);

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add cache-bust timestamp
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      console.log('Public URL:', publicUrl);

      // Save URL to profile table
      await updateProfile({ avatar_url: publicUrl });
      showToast('Profile picture updated!');

    } catch (err) {
      console.error('Upload error full:', err);
      showToast(err.message || 'Upload failed. Check console for details.', true);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /* ── DELETE ── */
  const handleDelete = async () => {
    if (!user || !avatarUrl) return;
    setDeleting(true);
    setShowMenu(false);

    try {
      // Try removing all possible extensions
      const paths = ['jpg','jpeg','png','webp','gif'].map(ext => `${user.id}/avatar.${ext}`);
      const { error } = await supabase.storage.from('avatars').remove(paths);
      if (error) console.warn('Storage remove warning:', error);

      await updateProfile({ avatar_url: null });
      showToast('Profile picture removed.');
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Failed to remove. Try again.', true);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="avatar-upload-wrap">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* ── Avatar circle ── */}
      <div className="avatar-upload-outer">
        <div className="avatar-upload-circle">
          {uploading ? (
            <div className="avatar-uploading">
              <i className="fa-solid fa-spinner fa-spin"></i>
            </div>
          ) : avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="avatar-img"
              onError={e => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          {/* Always render initials as fallback (hidden when image loads) */}
          <div
            className="avatar-initials"
            style={{ display: avatarUrl && !uploading ? 'none' : 'flex' }}
          >
            {initials}
          </div>
        </div>

        {/* Camera button */}
        <button
          className="avatar-camera-btn"
          onClick={() => avatarUrl ? setShowMenu(m => !m) : fileInputRef.current?.click()}
          disabled={uploading || deleting}
          title={avatarUrl ? 'Manage photo' : 'Upload photo'}
        >
          {uploading || deleting
            ? <i className="fa-solid fa-spinner fa-spin"></i>
            : <i className="fa-solid fa-camera"></i>
          }
        </button>
      </div>

      {/* ── Dropdown menu ── */}
      {showMenu && avatarUrl && (
        <>
          <div className="avatar-menu-overlay" onClick={() => setShowMenu(false)} />
          <div className="avatar-menu">
            <button
              className="avatar-menu-item"
              onClick={() => { setShowMenu(false); fileInputRef.current?.click(); }}
            >
              <i className="fa-solid fa-arrow-up-from-bracket"></i>
              Change Photo
            </button>
            <a
              className="avatar-menu-item"
              href={avatarUrl.split('?')[0]}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowMenu(false)}
            >
              <i className="fa-solid fa-eye"></i>
              View Full Size
            </a>
            <button
              className="avatar-menu-item danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              <i className="fa-solid fa-trash"></i>
              {deleting ? 'Removing…' : 'Remove Photo'}
            </button>
          </div>
        </>
      )}

      {/* Upload button when no avatar */}
      {!avatarUrl && !uploading && (
        <button
          className="avatar-upload-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          <i className="fa-solid fa-arrow-up-from-bracket"></i>
          Upload Photo
        </button>
      )}

      <p className="avatar-hint">JPG, PNG, WebP · Max 5MB</p>
    </div>
  );
}