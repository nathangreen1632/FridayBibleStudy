// Client/src/components/GravatarAvatar.tsx
import React, { useMemo, useState } from 'react';
import { getGravatarUrl, getInitials } from '../../helpers/gravatar.helper.ts';

type Props = Readonly<{
  email?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
  title?: string;
}>;

export default function GravatarAvatar(props: Props): React.ReactElement {
  const { email, name, size = 48, className, title } = props;
  const [imgOk, setImgOk] = useState(true);

  const url = useMemo(() => getGravatarUrl(email, size * 2), [email, size]);
  const initials = useMemo(() => getInitials(name || email || ''), [name, email]);

  const dimension = { width: size, height: size };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full overflow-hidden select-none ${className ?? ''}`}
      style={{ ...dimension, background: 'var(--theme-surface)', color: 'var(--theme-text)' }}
      title={title || (email || '')}
      aria-label="User avatar"
    >
      {imgOk && url ? (
        <img
          src={url}
          alt="Gravatar"
          style={{ ...dimension, objectFit: 'cover' }}
          onError={() => setImgOk(false)}
        />
      ) : (
        <div
          className="flex items-center justify-center font-semibold"
          style={{ ...dimension, background: 'var(--theme-card)' }}
        >
          <span className="text-sm">{initials}</span>
        </div>
      )}
    </div>
  );
}
