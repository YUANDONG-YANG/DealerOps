import { useEffect, useState } from 'react';

interface Country { iso: string; name: string; dial: string; }

const COUNTRIES: Country[] = [
  { iso: 'CA', name: 'Canada', dial: '1' },
  { iso: 'US', name: 'United States', dial: '1' },
  { iso: 'CN', name: 'China', dial: '86' },
  { iso: 'HK', name: 'Hong Kong', dial: '852' },
  { iso: 'TW', name: 'Taiwan', dial: '886' },
  { iso: 'IN', name: 'India', dial: '91' },
  { iso: 'PH', name: 'Philippines', dial: '63' },
  { iso: 'PK', name: 'Pakistan', dial: '92' },
  { iso: 'NG', name: 'Nigeria', dial: '234' },
  { iso: 'GB', name: 'United Kingdom', dial: '44' },
  { iso: 'FR', name: 'France', dial: '33' },
  { iso: 'DE', name: 'Germany', dial: '49' },
  { iso: 'IT', name: 'Italy', dial: '39' },
  { iso: 'ES', name: 'Spain', dial: '34' },
  { iso: 'MX', name: 'Mexico', dial: '52' },
  { iso: 'BR', name: 'Brazil', dial: '55' },
  { iso: 'AU', name: 'Australia', dial: '61' },
  { iso: 'NZ', name: 'New Zealand', dial: '64' },
  { iso: 'JP', name: 'Japan', dial: '81' },
  { iso: 'KR', name: 'South Korea', dial: '82' },
  { iso: 'SG', name: 'Singapore', dial: '65' },
  { iso: 'VN', name: 'Vietnam', dial: '84' },
  { iso: 'AE', name: 'United Arab Emirates', dial: '971' },
];

function dialOf(iso: string) {
  return COUNTRIES.find(c => c.iso === iso)?.dial ?? '1';
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
}

export default function PhoneInput({ value, onChange, onBlur, placeholder }: Props) {
  const [country, setCountry] = useState('CA');
  const [national, setNational] = useState('');

  useEffect(() => {
    if (!value) { setNational(''); return; }
    const digits = value.replace(/\D/g, '');
    const current = dialOf(country);
    const match = digits.startsWith(current)
      ? COUNTRIES.find(c => c.iso === country)
      : [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find(c => digits.startsWith(c.dial));
    if (match && `+${match.dial}${national.replace(/\D/g, '').replace(/^0+/, '')}` !== value) {
      setCountry(match.iso);
      setNational(digits.slice(match.dial.length));
    }
  }, [value]);

  function emit(nat: string, iso: string) {
    const digits = nat.replace(/\D/g, '').replace(/^0+/, '');
    onChange(digits ? `+${dialOf(iso)}${digits}` : '');
  }

  return (
    <div className="phone-input-wrap">
      <select
        className="select phone-country"
        value={country}
        onChange={e => { setCountry(e.target.value); emit(national, e.target.value); }}
        aria-label="Country code"
      >
        {COUNTRIES.map(c => (
          <option key={c.iso} value={c.iso}>{c.iso} +{c.dial}</option>
        ))}
      </select>
      <input
        className="input phone-national"
        type="tel"
        autoComplete="tel-national"
        placeholder={placeholder || 'Phone number'}
        value={national}
        onChange={e => { setNational(e.target.value); emit(e.target.value, country); }}
        onBlur={onBlur}
      />
    </div>
  );
}
