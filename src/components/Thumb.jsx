import { imgUrl } from '@/lib/api';

export const PH = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'%3E%3Crect width='4' height='3' fill='%23e8efe9'/%3E%3Ctext x='2' y='1.9' font-size='1.2' text-anchor='middle'%3E%F0%9F%9B%8D%EF%B8%8F%3C/text%3E%3C/svg%3E";
/* eslint-disable @next/next/no-img-element */
export const Thumb = ({ id, className = 'h-14 w-14 rounded-2xl' }) => <img src={imgUrl(id) || PH} alt="" loading="lazy" className={'bg-brand-light object-cover ' + className} />;
