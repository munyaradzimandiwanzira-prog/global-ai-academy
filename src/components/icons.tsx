/**
 * The project's only UI icon set: Google Material Symbols Outlined, locked to
 * FILL 0 · wght 100 · GRAD 0 · opsz 24, shown at 24px (see .material-symbols-outlined in index.css).
 *
 * The font is self-hosted and subset to exactly the symbols named in ICONS below
 * (`npm run icons` regenerates it), so every name is checked against a real glyph at build time —
 * a symbol that isn't in the subset is a type error, never a ligature word on screen.
 *
 * Components keep the names the codebase already used (ArrowRight, Lock …) so screens did not have
 * to change shape during the migration; each maps to the Material Symbol with the same meaning.
 */
import type { CSSProperties } from 'react';
import { CODEPOINTS, type SymbolName } from './icon-codepoints';

export type { SymbolName };

export interface IconProps {
  className?: string;
  style?: CSSProperties;
  /** Accessible name. Omit for decorative icons next to visible text (they are hidden from assistive tech). */
  label?: string;
  'aria-label'?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
  title?: string;
}

/** Sizing utilities from the old SVG set (h-4 w-4 …) would squeeze the 24px symbol box, so they are dropped. */
const SIZE_CLASS = /(^|\s)(!?(?:h|w|size)-[^\s]+)/g;

export function MaterialIcon({ name, className, style, label, title, ...aria }: IconProps & { name: SymbolName }) {
  const accessibleName = label ?? aria['aria-label'];
  const extra = className?.replace(SIZE_CLASS, ' ').trim();
  return (
    <span
      className={extra ? `material-symbols-outlined ${extra}` : 'material-symbols-outlined'}
      style={style}
      data-icon={name}
      title={title}
      role={accessibleName ? 'img' : undefined}
      aria-label={accessibleName}
      aria-hidden={accessibleName ? undefined : true}
    >
      {String.fromCodePoint(CODEPOINTS[name])}
    </span>
  );
}

export type IconComponent = (props: IconProps) => JSX.Element;

const icon = (name: SymbolName): IconComponent => {
  const C = (props: IconProps) => <MaterialIcon name={name} {...props} />;
  C.displayName = `Icon(${name})`;
  return C;
};

/** Old name → Material Symbol. Also the source list for the font subset (scripts/build-icons.py). */
export const ICONS = {
  AlarmClock: 'alarm',
  AlertCircle: 'error',
  Archive: 'archive',
  ArrowLeft: 'arrow_back',
  ArrowRight: 'arrow_forward',
  ArrowUp: 'arrow_upward',
  Award: 'workspace_premium',
  BookOpen: 'menu_book',
  BookOpenCheck: 'auto_stories',
  Brain: 'psychology',
  Briefcase: 'work',
  CalendarClock: 'event_upcoming',
  Check: 'check',
  CheckCircle2: 'check_circle',
  ChevronDown: 'expand_more',
  ChevronLeft: 'chevron_left',
  ChevronRight: 'chevron_right',
  Circle: 'radio_button_unchecked',
  ClipboardCheck: 'assignment_turned_in',
  ClipboardList: 'assignment',
  Clock: 'schedule',
  Cloud: 'cloud',
  Code2: 'code',
  Copy: 'content_copy',
  CornerDownLeft: 'keyboard_return',
  CreditCard: 'credit_card',
  Database: 'database',
  Delete: 'backspace',
  Eraser: 'ink_eraser',
  ExternalLink: 'open_in_new',
  Eye: 'visibility',
  FileText: 'description',
  Flame: 'local_fire_department',
  FolderCode: 'folder_code',
  Github: 'code',
  Globe2: 'public',
  GraduationCap: 'school',
  Hammer: 'construction',
  HandHeart: 'volunteer_activism',
  Heart: 'favorite',
  HeartPulse: 'monitor_heart',
  Inbox: 'inbox',
  KeyRound: 'key',
  Keyboard: 'keyboard',
  LayoutDashboard: 'dashboard',
  Lightbulb: 'lightbulb',
  Link2: 'link',
  Link2Off: 'link_off',
  ListOrdered: 'format_list_numbered',
  Loader2: 'progress_activity',
  Lock: 'lock',
  LogOut: 'logout',
  Mail: 'mail',
  MailWarning: 'mark_email_unread',
  MapPin: 'location_on',
  Megaphone: 'campaign',
  Menu: 'menu',
  MessageCircle: 'chat_bubble',
  MessageSquare: 'chat',
  Minus: 'remove',
  Moon: 'dark_mode',
  Phone: 'call',
  Play: 'play_arrow',
  PlayCircle: 'play_circle',
  Plus: 'add',
  Printer: 'print',
  RefreshCw: 'refresh',
  Repeat: 'repeat',
  Rocket: 'rocket_launch',
  RotateCcw: 'restart_alt',
  RotateCw: 'rotate_right',
  Rows3: 'table_rows',
  Save: 'save',
  ScrollText: 'history_edu',
  Search: 'search',
  Send: 'send',
  Server: 'dns',
  Settings: 'settings',
  Share2: 'share',
  Shield: 'shield',
  ShieldAlert: 'gpp_maybe',
  ShieldCheck: 'verified_user',
  ShieldX: 'gpp_bad',
  Smartphone: 'smartphone',
  Sparkles: 'auto_awesome',
  Star: 'star',
  Sun: 'light_mode',
  Tag: 'sell',
  Target: 'target',
  Terminal: 'terminal',
  Timer: 'timer',
  Trash2: 'delete',
  Trophy: 'trophy',
  Undo2: 'undo',
  UserCheck: 'how_to_reg',
  Users: 'group',
  Video: 'videocam',
  Volume2: 'volume_up',
  VolumeX: 'volume_off',
  Wand2: 'auto_fix_high',
  Wifi: 'wifi',
  Wrench: 'build',
  X: 'close',
  XCircle: 'cancel',
  Zap: 'bolt',
} as const satisfies Record<string, SymbolName>;

export const AlarmClock = icon(ICONS.AlarmClock);
export const AlertCircle = icon(ICONS.AlertCircle);
export const Archive = icon(ICONS.Archive);
export const ArrowLeft = icon(ICONS.ArrowLeft);
export const ArrowRight = icon(ICONS.ArrowRight);
export const ArrowUp = icon(ICONS.ArrowUp);
export const Award = icon(ICONS.Award);
export const BookOpen = icon(ICONS.BookOpen);
export const BookOpenCheck = icon(ICONS.BookOpenCheck);
export const Brain = icon(ICONS.Brain);
export const Briefcase = icon(ICONS.Briefcase);
export const CalendarClock = icon(ICONS.CalendarClock);
export const Check = icon(ICONS.Check);
export const CheckCircle2 = icon(ICONS.CheckCircle2);
export const ChevronDown = icon(ICONS.ChevronDown);
export const ChevronLeft = icon(ICONS.ChevronLeft);
export const ChevronRight = icon(ICONS.ChevronRight);
export const Circle = icon(ICONS.Circle);
export const ClipboardCheck = icon(ICONS.ClipboardCheck);
export const ClipboardList = icon(ICONS.ClipboardList);
export const Clock = icon(ICONS.Clock);
export const Cloud = icon(ICONS.Cloud);
export const Code2 = icon(ICONS.Code2);
export const Copy = icon(ICONS.Copy);
export const CornerDownLeft = icon(ICONS.CornerDownLeft);
export const CreditCard = icon(ICONS.CreditCard);
export const Database = icon(ICONS.Database);
export const Delete = icon(ICONS.Delete);
export const Eraser = icon(ICONS.Eraser);
export const ExternalLink = icon(ICONS.ExternalLink);
export const Eye = icon(ICONS.Eye);
export const FileText = icon(ICONS.FileText);
export const Flame = icon(ICONS.Flame);
export const FolderCode = icon(ICONS.FolderCode);
export const Github = icon(ICONS.Github);
export const Globe2 = icon(ICONS.Globe2);
export const GraduationCap = icon(ICONS.GraduationCap);
export const Hammer = icon(ICONS.Hammer);
export const HandHeart = icon(ICONS.HandHeart);
export const Heart = icon(ICONS.Heart);
export const HeartPulse = icon(ICONS.HeartPulse);
export const Inbox = icon(ICONS.Inbox);
export const KeyRound = icon(ICONS.KeyRound);
export const Keyboard = icon(ICONS.Keyboard);
export const LayoutDashboard = icon(ICONS.LayoutDashboard);
export const Lightbulb = icon(ICONS.Lightbulb);
export const Link2 = icon(ICONS.Link2);
export const Link2Off = icon(ICONS.Link2Off);
export const ListOrdered = icon(ICONS.ListOrdered);
export const Loader2 = icon(ICONS.Loader2);
export const Lock = icon(ICONS.Lock);
export const LogOut = icon(ICONS.LogOut);
export const Mail = icon(ICONS.Mail);
export const MailWarning = icon(ICONS.MailWarning);
export const MapPin = icon(ICONS.MapPin);
export const Megaphone = icon(ICONS.Megaphone);
export const Menu = icon(ICONS.Menu);
export const MessageCircle = icon(ICONS.MessageCircle);
export const MessageSquare = icon(ICONS.MessageSquare);
export const Minus = icon(ICONS.Minus);
export const Moon = icon(ICONS.Moon);
export const Phone = icon(ICONS.Phone);
export const Play = icon(ICONS.Play);
export const PlayCircle = icon(ICONS.PlayCircle);
export const Plus = icon(ICONS.Plus);
export const Printer = icon(ICONS.Printer);
export const RefreshCw = icon(ICONS.RefreshCw);
export const Repeat = icon(ICONS.Repeat);
export const Rocket = icon(ICONS.Rocket);
export const RotateCcw = icon(ICONS.RotateCcw);
export const RotateCw = icon(ICONS.RotateCw);
export const Rows3 = icon(ICONS.Rows3);
export const Save = icon(ICONS.Save);
export const ScrollText = icon(ICONS.ScrollText);
export const Search = icon(ICONS.Search);
export const Send = icon(ICONS.Send);
export const Server = icon(ICONS.Server);
export const Settings = icon(ICONS.Settings);
export const Share2 = icon(ICONS.Share2);
export const Shield = icon(ICONS.Shield);
export const ShieldAlert = icon(ICONS.ShieldAlert);
export const ShieldCheck = icon(ICONS.ShieldCheck);
export const ShieldX = icon(ICONS.ShieldX);
export const Smartphone = icon(ICONS.Smartphone);
export const Sparkles = icon(ICONS.Sparkles);
export const Star = icon(ICONS.Star);
export const Sun = icon(ICONS.Sun);
export const Tag = icon(ICONS.Tag);
export const Target = icon(ICONS.Target);
export const Terminal = icon(ICONS.Terminal);
export const Timer = icon(ICONS.Timer);
export const Trash2 = icon(ICONS.Trash2);
export const Trophy = icon(ICONS.Trophy);
export const Undo2 = icon(ICONS.Undo2);
export const UserCheck = icon(ICONS.UserCheck);
export const Users = icon(ICONS.Users);
export const Video = icon(ICONS.Video);
export const Volume2 = icon(ICONS.Volume2);
export const VolumeX = icon(ICONS.VolumeX);
export const Wand2 = icon(ICONS.Wand2);
export const Wifi = icon(ICONS.Wifi);
export const Wrench = icon(ICONS.Wrench);
export const X = icon(ICONS.X);
export const XCircle = icon(ICONS.XCircle);
export const Zap = icon(ICONS.Zap);
