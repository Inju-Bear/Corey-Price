import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  auth, 
  db, 
  storage,
  googleProvider, 
  facebookProvider,
  appleProvider,
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut, 
  updateProfile,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  collectionGroup,
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  addDoc,
  onSnapshot, 
  query, 
  orderBy,
  where,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
  deleteField
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Map as MapIcon, 
  Clock, 
  User as UserIcon, 
  Bell, 
  LogOut, 
  ChevronRight, 
  ChevronLeft,
  Search, 
  Filter,
  Info,
  Menu,
  X,
  CreditCard,
  GraduationCap,
  Users,
  Trash2,
  Edit2,
  Share2,
  Send,
  Star,
  ZoomIn,
  ZoomOut,
  Download,
  RefreshCcw,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  Mail,
  Lock,
  Briefcase,
  ExternalLink,
  Facebook,
  Linkedin,
  Twitter,
  Apple,
  QrCode,
  ScanLine,
  UserPlus,
  Phone,
  FileText,
  MapPin,
  Camera,
  AlertTriangle,
  MessageSquare,
  LayoutDashboard,
  Settings,
  Eye,
  EyeOff,
  Upload,
  WifiOff,
  X
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO
} from 'date-fns';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { MapContainer, TileLayer, Marker, Popup, ImageOverlay, useMap } from 'react-leaflet';
import L from 'leaflet';
import { QRCodeCanvas } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

// --- Leaflet Icon Fix ---
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = icon;

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const isWorkshopHappeningNow = (timeStr: string) => {
  const now = new Date();
  const match = timeStr.match(/(\d+):(\d+) (AM|PM)/);
  if (!match) return false;
  let [_, hr, mn, ampm] = match;
  let hour = parseInt(hr, 10);
  if (ampm === 'PM' && hour < 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  
  const Math_floor = Math.floor;
  
  const seminarStart = new Date(now);
  seminarStart.setHours(hour, parseInt(mn, 10), 0, 0);
  // Assume seminar is 1 hour long
  const seminarEnd = new Date(seminarStart.getTime() + 60 * 60 * 1000);
  
  return now >= seminarStart && now <= seminarEnd;
};

const isWorkshopUpcoming = (timeStr: string) => {
  const now = new Date();
  const match = timeStr.match(/(\d+):(\d+) (AM|PM)/);
  if (!match) return false;
  let [_, hr, mn, ampm] = match;
  let hour = parseInt(hr, 10);
  if (ampm === 'PM' && hour < 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  
  const seminarStart = new Date(now);
  seminarStart.setHours(hour, parseInt(mn, 10), 0, 0);
  
  return now < seminarStart && (seminarStart.getTime() - now.getTime()) < 2 * 60 * 60 * 1000;
};

// --- Types ---
type Role = 'student' | 'parent' | 'admin' | 'recruiter';

interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  school?: string;
  graduationYear?: string;
  major?: string;
  interests?: string[];
  linkedin?: string;
  phone?: string;
  photoURL?: string;
  resumeUrl?: string; // URL to the hosted resume document
  workAuthorization?: 'authorized' | 'requires-sponsorship' | 'not-authorized';
  preferredContact?: 'email' | 'phone' | 'linkedin';
  unlockedEvents?: string[];
  hasScholarshipAccess?: boolean;
  createdAt: string;
  isAthlete?: boolean;
  sport?: string;
}

interface Lead {
  id: string;
  recruiterId: string;
  eventId?: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhotoUrl?: string;
  studentSchool?: string;
  studentMajor?: string;
  studentGradYear?: string;
  studentInterests?: string[];
  studentLinkedin?: string;
  studentPhone?: string;
  studentWorkAuth?: string;
  studentResumeUrl?: string;
  studentPreferredContact?: string;
  studentIsAthlete?: boolean;
  studentSport?: string;
  notes?: string;
  scannedAt: string;
}

interface ExpoEvent {
  id: string;
  name: string;
  city: string;
  date: string;
  time: string;
  timezone?: string;
  location: string;
  description: string;
  mapUrl: string;
  floorPlanUrl?: string;
  status?: 'published' | 'draft';
}

interface Seminar {
  id: string;
  eventId: string;
  title: string;
  speaker: string;
  time: string;
  room: string;
  category: string;
  description?: string;
  status?: 'published' | 'draft';
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'update' | 'reminder';
  read: boolean;
  createdAt: string;
}

interface Feedback {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface Sponsor {
  id: string;
  eventId: string;
  name: string;
  logoUrl: string;
  tier: 'platinum' | 'gold' | 'silver' | 'bronze' | 'exhibitor';
  websiteUrl?: string;
  description?: string;
  boothId?: number;
  createdAt: string;
}

const PLACEHOLDER_BOOTHS = [
  { id: 1, name: 'Main Presentation Stage', y: 450, x: 500, type: 'stage', description: 'Main hall for keynote speeches and scholarship giveaways.' },
  { id: 2, name: 'HBCU Hub', y: 350, x: 250, type: 'booth', description: 'Central gathering for all HBCU representatives.' },
  { id: 3, name: 'UCLA Admissions', y: 350, x: 750, type: 'booth', description: 'Official UCLA information booth.' },
  { id: 4, name: 'Google Tech Center', y: 650, x: 300, type: 'booth', description: 'Internship and career opportunities at Google.' },
  { id: 5, name: 'Main Registration', y: 880, x: 500, type: 'service', description: 'Check-in and materials distribution.' },
  { id: 6, name: 'Food & Refreshments', y: 120, x: 500, type: 'service', description: 'Snacks and drinks available here.' },
  { id: 7, name: 'Seminar Room A', y: 750, x: 180, type: 'seminar', description: 'Workshops about financial aid and FAFSA.' },
  { id: 8, name: 'Seminar Room B', y: 750, x: 820, type: 'seminar', description: 'Writing the perfect college essay workshops.' },
  { id: 9, name: 'NCRF Admin Help', y: 200, x: 200, type: 'service', description: 'General foundation assistance.' },
  { id: 10, name: 'Sponsorship VIP Lounge', y: 200, x: 800, type: 'booth', description: 'Exclusive area for event sponsors.' },
];

interface EventUpdate {
  id: string;
  eventId: string;
  message: string;
  type: 'info' | 'warning' | 'alert';
  targetAudience?: 'all' | 'student' | 'parent' | 'recruiter' | 'admin';
  createdAt: string;
}

interface ScholarshipApplication {
  id: string;
  name: string;
  provider: string;
  amount: number;
  deadline: string;
  status: 'pending' | 'awarded' | 'rejected' | 'draft';
  essay?: string;
  documents?: { name: string, url: string, type: string }[];
  notes?: string;
}

// --- Context ---
const UserContext = createContext<{
  user: AppUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  notifications: Notification[];
  markAsRead: (id: string) => Promise<void>;
}>({ user: null, loading: true, signIn: async () => {}, logout: async () => {}, notifications: [], markAsRead: async () => {} });

// --- Helper for Calendar Links ---
const getCalendarLinks = (event: ExpoEvent) => {
  try {
    const eventDate = new Date(event.date);
    const start = new Date(eventDate);
    start.setHours(9, 0, 0);
    const end = new Date(eventDate);
    end.setHours(16, 0, 0);

    const formatG = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    
    const title = encodeURIComponent(event.name);
    const details = encodeURIComponent(event.description);
    const location = encodeURIComponent(`${event.location}, ${event.city}`);
    
    return {
      google: `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatG(start)}/${formatG(end)}&details=${details}&location=${location}`,
      outlook: `https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${title}&startdt=${start.toISOString()}&enddt=${end.toISOString()}&body=${details}&location=${location}`
    };
  } catch (e) {
    return { google: '#', outlook: '#' };
  }
};

const getSeminarCalendarLinks = (event: ExpoEvent, seminar: Seminar) => {
  try {
    const eventDate = new Date(event.date);
    const start = new Date(eventDate);
    
    // Parse s.time like "10:30 AM" or "1:00 PM"
    const timeRe = /(\d+):(\d+)\s*(AM|PM)/i;
    const match = seminar.time.match(timeRe);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const ampm = match[3].toUpperCase();
      
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      
      start.setHours(hours, minutes, 0);
    } else {
      // Fallback
      start.setHours(10, 0, 0);
    }
    
    const end = new Date(start.getTime() + 45 * 60000); // 45 min duration

    const formatG = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    
    const title = encodeURIComponent(`${seminar.title} - ${event.name}`);
    const details = encodeURIComponent(`${seminar.description || ''}\nSpeaker: ${seminar.speaker}\nRoom: ${seminar.room}`);
    const location = encodeURIComponent(`${seminar.room}, ${event.location}, ${event.city}`);
    
    return {
      google: `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatG(start)}/${formatG(end)}&details=${details}&location=${location}`,
      outlook: `https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${title}&startdt=${start.toISOString()}&enddt=${end.toISOString()}&body=${details}&location=${location}`
    };
  } catch (e) {
    return { google: '#', outlook: '#' };
  }
};

const getShareLinks = (event: ExpoEvent) => {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent(`Check out the ${event.name} in ${event.city}!`);
  const subject = encodeURIComponent(`NCRF Event: ${event.name}`);
  const body = encodeURIComponent(`Check out this event: ${event.name}\n\nLocation: ${event.location}, ${event.city}\nDate: ${format(new Date(event.date), 'PPPP')}\n\n${event.description}`);

  return {
    twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    email: `mailto:?subject=${subject}&body=${body}`
  };
};

// --- Components ---

// --- Components ---

const StudentDigitalCard = ({ user }: { user: AppUser }) => {
  const cardData = JSON.stringify({
    uid: user.uid,
    name: user.displayName,
    email: user.email,
    photo: user.photoURL || '',
    school: user.school || 'N/A',
    gradYear: user.graduationYear || 'N/A',
    major: user.major || 'N/A',
    interests: user.interests || [],
    linkedin: user.linkedin || '',
    phone: user.phone || '',
    workAuth: user.workAuthorization || 'authorized',
    resumeUrl: user.resumeUrl || '',
    prefContact: user.preferredContact || 'email',
    isAthlete: user.isAthlete || false,
    sport: user.sport || '',
    type: 'expo-lead-v1'
  });

  const handleDownloadQR = () => {
    const canvas = document.getElementById('student-qr-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    
    const pngUrl = canvas
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream");
    
    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `${user.displayName.replace(/\s+/g, '_')}_QR.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-[#E4E6EB]">
        <div className="bg-[#D32F2F] p-8 text-center text-white">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white/30 overflow-hidden shadow-inner">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <UserIcon className="w-12 h-12 text-white" />
            )}
          </div>
          <h2 className="text-2xl font-bold">{user.displayName}</h2>
          <p className="text-white/80 text-sm mt-1">{user.school || 'College Applicant'}</p>
        </div>
        
        <div className="p-8 flex flex-col items-center">
          <div className="flex flex-col items-center gap-4 mb-8 w-full">
            <div className="bg-white p-4 rounded-xl shadow-md border border-[#E4E6EB]">
              <QRCodeCanvas 
                id="student-qr-canvas"
                value={cardData} 
                size={200}
                level="H"
                includeMargin={true}
                imageSettings={{
                  src: "https://upload.wikimedia.org/wikipedia/commons/4/41/QR_Code_Example.svg", // Placeholder or app logo
                  x: undefined,
                  y: undefined,
                  height: 40,
                  width: 40,
                  excavate: true,
                }}
              />
            </div>
            <button 
              onClick={handleDownloadQR}
              className="flex items-center gap-2 px-4 py-2 bg-[#F0F2F5] hover:bg-[#E4E6EB] text-[#1C1E21] font-bold rounded-lg transition-colors text-sm shadow-sm border border-[#E4E6EB]"
            >
              <Download className="w-4 h-4" />
              Download PNG
            </button>
          </div>
          
          <div className="w-full space-y-4">
            <div className="flex items-center gap-4 p-4 bg-[#F8F9FA] rounded-xl border border-[#E4E6EB]">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <Mail className="w-5 h-5 text-[#D32F2F]" />
              </div>
              <div>
                <div className="text-[10px] text-[#606770] font-bold uppercase">Email Address</div>
                <div className="text-[14px] font-medium text-[#1C1E21]">{user.email}</div>
              </div>
            </div>

            {user.graduationYear && (
              <div className="flex items-center gap-4 p-4 bg-[#F8F9FA] rounded-xl border border-[#E4E6EB]">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <GraduationCap className="w-5 h-5 text-[#D32F2F]" />
                </div>
                <div>
                  <div className="text-[10px] text-[#606770] font-bold uppercase">Expected Graduation</div>
                  <div className="text-[14px] font-medium text-[#1C1E21]">{user.graduationYear}</div>
                </div>
              </div>
            )}

            {user.phone && (
              <div className="flex items-center gap-4 p-4 bg-[#F8F9FA] rounded-xl border border-[#E4E6EB]">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Phone className="w-5 h-5 text-[#D32F2F]" />
                </div>
                <div>
                  <div className="text-[10px] text-[#606770] font-bold uppercase">Phone Number</div>
                  <div className="text-[14px] font-medium text-[#1C1E21]">{user.phone}</div>
                </div>
              </div>
            )}

            {user.workAuthorization && (
              <div className="flex items-center gap-4 p-4 bg-[#F8F9FA] rounded-xl border border-[#E4E6EB]">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Briefcase className="w-5 h-5 text-[#D32F2F]" />
                </div>
                <div>
                  <div className="text-[10px] text-[#606770] font-bold uppercase">Work Authorization</div>
                  <div className="text-[14px] font-medium text-[#1C1E21]">
                    {user.workAuthorization === 'authorized' ? 'Legally Authorized' : user.workAuthorization === 'requires-sponsorship' ? 'Requires Sponsorship' : 'Not Authorized'}
                  </div>
                </div>
              </div>
            )}

            {user.preferredContact && (
               <div className="flex items-center gap-4 p-4 bg-[#F8F9FA] rounded-xl border border-[#E4E6EB]">
                 <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                   <MessageSquare className="w-5 h-5 text-[#D32F2F]" />
                 </div>
                 <div>
                   <div className="text-[10px] text-[#606770] font-bold uppercase">Preferred Contact</div>
                   <div className="text-[14px] font-medium capitalize text-[#1C1E21]">{user.preferredContact}</div>
                 </div>
               </div>
            )}

            {user.interests && user.interests.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {user.interests.map((interest, i) => (
                  <span key={i} className="px-3 py-1 bg-[#EEF2FF] text-[#4F46E5] text-[12px] font-bold rounded-full border border-[#D1D5DB]">
                    {interest}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-[#F0F2F5] border-t border-[#E4E6EB] text-center">
          <p className="text-[12px] text-[#606770]">Show this QR code to recruiters to share your profile.</p>
        </div>
      </div>
    </div>
  );
};

const ScannerModal = ({ isOpen, onClose, onScanSuccess, onScanError }: { isOpen: boolean, onClose: () => void, onScanSuccess: (data: any) => void, onScanError: (error: string) => void }) => {
  const [internalError, setInternalError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setInternalError(null);
      return;
    }
    const scanner = new Html5QrcodeScanner(
      "reader-modal", 
      { 
        fps: 10, 
        aspectRatio: window.innerHeight / window.innerWidth,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true
      }, 
      /* verbose= */ false
    );

    scanner.render((decodedText) => {
      try {
        const data = JSON.parse(decodedText);
        if (data.type === 'expo-lead-v1') {
          scanner.clear();
          setInternalError(null);
          onScanSuccess(data);
          onClose();
        } else {
          setInternalError('Invalid QR code type. Please scan an Expo Student Card.');
          onScanError('Invalid QR code type. Please scan an Expo Student Card.');
        }
      } catch (err) {
        setInternalError('Could not read QR code. Please try again.');
        onScanError('Could not read QR code. Please try again.');
      }
    }, (err) => {
      // Silent error
    });

    return () => {
      scanner.clear().catch(error => console.error("Failed to clear html5QrcodeScanner", error));
    };
  }, [isOpen, onScanSuccess, onScanError, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex justify-between items-center w-full p-4 absolute top-0 z-[60] bg-gradient-to-b from-black/80 to-transparent">
        <div className="text-white font-bold text-lg">Scan Student Card</div>
        <button onClick={onClose} className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition shadow-lg backdrop-blur-sm">
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="relative flex-grow flex items-center justify-center overflow-hidden">
        <div 
          id="reader-modal" 
          className="w-full h-full [&>img]:hidden [&_video]:object-cover [&_video]:w-full [&_video]:h-full [&>div]:border-none [&>div]:shadow-none [&_select]:bg-black/50 [&_select]:text-white [&_select]:border-white/30 [&_select]:rounded-lg [&_select]:p-2 [&_button]:bg-[#1976D2] [&_button]:text-white [&_button]:border-none [&_button]:rounded-lg [&_button]:px-4 [&_button]:py-2 [&_button]:font-bold [&_button]:mt-2"
        ></div>
        
        {/* Custom Overlay */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
          <div className="w-64 h-64 border-2 border-white/50 rounded-3xl relative">
            {/* Corners */}
            <div className="w-8 h-8 rounded-tl-2xl border-t-4 border-l-4 border-white absolute -top-1 -left-1"></div>
            <div className="w-8 h-8 rounded-tr-2xl border-t-4 border-r-4 border-white absolute -top-1 -right-1"></div>
            <div className="w-8 h-8 rounded-bl-2xl border-b-4 border-l-4 border-white absolute -bottom-1 -left-1"></div>
            <div className="w-8 h-8 rounded-br-2xl border-b-4 border-r-4 border-white absolute -bottom-1 -right-1"></div>
            
            {/* Scan Line Animation */}
            <div className="w-full h-0.5 bg-[#1976D2] absolute top-1/2 left-0 shadow-[0_0_8px_2px_rgba(25,118,210,0.5)] animate-pulse"></div>
          </div>
        </div>
      </div>
      
      {internalError && (
        <div className="absolute bottom-24 w-full px-8 z-[60]">
          <div className="bg-[#D32F2F] text-white text-[13px] font-bold p-3 rounded-lg text-center shadow-lg border border-red-500">
            {internalError}
          </div>
        </div>
      )}
      
      <div className="absolute bottom-10 w-full text-center text-white text-[15px] font-medium px-8 drop-shadow-md z-[60]">
        Position the QR code within the frame to capture automatically
      </div>
    </div>
  );
};

const LeadScanner = ({ user, events }: { user: AppUser, events: ExpoEvent[] }) => {
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successName, setSuccessName] = useState('');
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [offlineLeadsCount, setOfflineLeadsCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    const updateOfflineCount = () => {
      const offlineLeads = JSON.parse(localStorage.getItem('offlineLeads') || '[]');
      setOfflineLeadsCount(offlineLeads.length);
    };
    updateOfflineCount();
    window.addEventListener('online', updateOfflineCount);
    return () => window.removeEventListener('online', updateOfflineCount);
  }, [showSuccess]);

  const hasAccess = selectedEventId ? ((user.unlockedEvents || []).includes(selectedEventId) || (user.unlockedEvents || []).includes('all_events')) : false;

  const syncOfflineLeads = async () => {
    const offlineLeads = JSON.parse(localStorage.getItem('offlineLeads') || '[]');
    if (offlineLeads.length === 0) return;
    
    setIsSyncing(true);
    setSyncError(null);
    let successCount = 0;
    
    try {
      for (const lead of offlineLeads) {
        const { _offlineId, ...leadData } = lead;
        await addDoc(collection(db, 'leads'), leadData);
        successCount++;
      }
      localStorage.removeItem('offlineLeads');
      setOfflineLeadsCount(0);
      alert(`Successfully synced ${successCount} leads!`);
    } catch (err: any) {
      console.error('Error syncing offline leads:', err);
      // Keep remaining unsigned leads in local storage
      const remainingLeads = offlineLeads.slice(successCount);
      localStorage.setItem('offlineLeads', JSON.stringify(remainingLeads));
      setOfflineLeadsCount(remainingLeads.length);
      setSyncError('Network error while syncing. Try again when connectivity improves.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCheckout = async (mode: 'single' | 'all') => {
    if (!selectedEventId) return;
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recruiterId: user.uid,
          eventId: mode === 'all' ? 'all_events' : selectedEventId,
          totalCount: mode === 'all' ? events.length : 1
        })
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Error initiating checkout: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Could not connect to payment server.');
    }
  };

  const handleSaveLead = async () => {
    if (!scanResult) return;
    setSaving(true);
    try {
      const leadData: Omit<Lead, 'id'> = {
        recruiterId: user.uid,
        eventId: selectedEventId || '',
        studentId: scanResult.uid,
        studentName: scanResult.name,
        studentEmail: scanResult.email,
        studentPhotoUrl: scanResult.photo,
        studentSchool: scanResult.school,
        studentMajor: scanResult.major,
        studentGradYear: scanResult.gradYear,
        studentInterests: scanResult.interests,
        studentLinkedin: scanResult.linkedin,
        studentPhone: scanResult.phone,
        studentWorkAuth: scanResult.workAuth,
        studentResumeUrl: scanResult.resumeUrl,
        studentPreferredContact: scanResult.prefContact,
        studentIsAthlete: scanResult.isAthlete,
        studentSport: scanResult.sport,
        notes,
        scannedAt: new Date().toISOString()
      };

      if (!navigator.onLine) {
        const offlineLeads = JSON.parse(localStorage.getItem('offlineLeads') || '[]');
        const newOfflineLead = { ...leadData, _offlineId: Date.now().toString() };
        localStorage.setItem('offlineLeads', JSON.stringify([...offlineLeads, newOfflineLead]));
        setOfflineLeadsCount(offlineLeads.length + 1);
        setSuccessName(scanResult.name + ' (Saved Offline)');
        setShowSuccess(true);
        setScanResult(null);
        setNotes('');
        return;
      }
      
      await addDoc(collection(db, 'leads'), leadData);
      setSuccessName(scanResult.name);
      setShowSuccess(true);
      setScanResult(null);
      setNotes('');
    } catch (err: any) {
      if (err.message?.includes('network') || err.code === 'unavailable' || !navigator.onLine) {
        const offlineLeads = JSON.parse(localStorage.getItem('offlineLeads') || '[]');
        const newOfflineLead = { ...leadData, _offlineId: Date.now().toString() };
        localStorage.setItem('offlineLeads', JSON.stringify([...offlineLeads, newOfflineLead]));
        setOfflineLeadsCount(offlineLeads.length + 1);
        setSuccessName(scanResult.name + ' (Saved Offline)');
        setShowSuccess(true);
        setScanResult(null);
        setNotes('');
        return;
      }
      handleFirestoreError(err, OperationType.CREATE, 'leads');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {offlineLeadsCount > 0 && (
        <div className="bg-[#FFF3E0] rounded-2xl shadow-sm border border-[#FFE082] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FFCC80] rounded-full flex items-center justify-center text-[#E65100]">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#E65100]">Offline Leads Pending</h3>
              <p className="text-[12px] text-[#E65100]/80">You have {offlineLeadsCount} lead{offlineLeadsCount === 1 ? '' : 's'} saved temporarily. Connect to the network to sync them.</p>
            </div>
          </div>
          <button 
            onClick={syncOfflineLeads}
            disabled={isSyncing || !navigator.onLine}
            className="w-full sm:w-auto px-4 py-2 bg-[#E65100] text-white font-bold rounded-lg hover:bg-[#F57C00] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      )}
      
      {syncError && (
        <div className="bg-[#FFF5F5] rounded-lg p-3 text-sm text-[#D32F2F] border border-[#FFEBEE]">
          {syncError}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-[#E4E6EB] p-6">
        <label className="block text-[12px] font-bold text-[#606770] uppercase mb-2">Select Event to Scan For</label>
        <select 
          value={selectedEventId || ''} 
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="w-full p-3 bg-[#F8F9FA] border border-[#E4E6EB] rounded-xl outline-none focus:border-[#1976D2]"
        >
          <option value="" disabled>Select an event...</option>
          {events.map((e) => (
             <option key={e.id} value={e.id}>{e.name} ({e.city})</option>
          ))}
        </select>
      </div>

      {!selectedEventId ? (
         <div className="bg-white rounded-2xl shadow-sm border border-[#E4E6EB] p-12 text-center text-[#606770]">
           Please select an event to continue.
         </div>
      ) : !hasAccess ? (
         <div className="bg-white rounded-2xl shadow-sm border border-[#E4E6EB] p-8 text-center">
           <div className="w-16 h-16 bg-[#FFF5F5] rounded-full flex items-center justify-center mx-auto mb-4">
             <Lock className="w-8 h-8 text-[#D32F2F]" />
           </div>
           <h2 className="text-xl font-black text-[#1C1E21] mb-2">Unlock QR Scanning</h2>
           <p className="text-[#606770] text-[14px] max-w-md mx-auto mb-6">Capture leads instantly by scanning student QR cards. Upgrade your access for this event for just $25.</p>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
             <div className="p-6 border-2 border-[#E4E6EB] rounded-2xl flex flex-col hover:border-[#1976D2] transition-colors relative">
                <h3 className="text-lg font-bold text-[#1C1E21] mb-1">Single Event Pass</h3>
                <p className="text-[#606770] text-[13px] mb-4 flex-grow">Unlock lead scanning for the currently selected event only.</p>
                <div className="text-3xl font-black text-[#1C1E21] mb-4">$25<span className="text-[14px] font-medium text-[#606770]">/event</span></div>
                <button 
                  onClick={() => handleCheckout('single')}
                  className="w-full py-3 bg-white border border-[#1976D2] text-[#1976D2] font-bold rounded-xl hover:bg-[#F0F7FF] transition-colors shadow-sm"
                >
                  Select Single Event
                </button>
             </div>

             <div className="p-6 border-2 border-[#1976D2] bg-[#F0F7FF] rounded-2xl flex flex-col relative shadow-md">
                <div className="absolute top-0 right-0 bg-[#1976D2] text-white text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl">Best Value</div>
                <h3 className="text-lg font-bold text-[#1C1E21] mb-1">All Events Pass</h3>
                <p className="text-[#606770] text-[13px] mb-4 flex-grow">Unlock lead scanning for every active Expo event. (5% Discount applied)</p>
                <div className="text-3xl font-black text-[#1C1E21] mb-4">${Math.floor(events.length * 25 * 0.95)}<span className="text-[14px] font-medium text-[#606770]">/all</span></div>
                <button 
                  onClick={() => handleCheckout('all')}
                  className="w-full py-3 bg-[#1976D2] text-white font-bold rounded-xl hover:bg-[#1565C0] transition-colors shadow-md"
                >
                  Select All Events
                </button>
             </div>
           </div>
         </div>
      ) : showSuccess ? (
        <div className="bg-white rounded-2xl shadow-xl border border-[#E4E6EB] p-12 text-center">
          <div className="w-20 h-20 bg-[#E8F5E9] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-[#2E7D32]" />
          </div>
          <h2 className="text-3xl font-black text-[#1C1E21] mb-2 tracking-tight">{successName} Saved!</h2>
          <p className="text-[#606770] mb-8 font-medium">The lead has been successfully added to your database.</p>
          <button 
            onClick={() => setShowSuccess(false)}
            className="px-8 py-3.5 bg-[#1976D2] text-white font-bold rounded-xl hover:bg-[#1565C0] transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 mx-auto disabled:opacity-50 active:scale-[0.98]"
          >
            <ScanLine className="w-5 h-5" />
            Scan Next Student
          </button>
        </div>
      ) : !scanResult ? (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E4E6EB] p-6 text-center">
          <h2 className="text-xl font-bold text-[#1C1E21] mb-2 flex items-center justify-center gap-2">
            <ScanLine className="w-6 h-6 text-[#D32F2F]" />
            Scan Student Card
          </h2>
          <p className="text-[#606770] text-sm mb-6">Scan a student's digital QR card to capture their contact information.</p>
          
          <button 
            onClick={() => setIsScannerModalOpen(true)}
            className="w-full max-w-xs mx-auto py-4 bg-[#1976D2] text-white font-bold rounded-xl hover:bg-[#1565C0] transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <ScanLine className="w-5 h-5" />
            Open Camera Scanner
          </button>
          
          <ScannerModal
            isOpen={isScannerModalOpen}
            onClose={() => setIsScannerModalOpen(false)}
            onScanSuccess={(data) => setScanResult(data)}
            onScanError={(err) => setError(err)}
          />
          
          {error && (
            <div className="mt-4 p-4 bg-[#FFF5F5] text-[#D32F2F] rounded-lg text-sm border border-[#FFEBEE]">
              {error}
              <button onClick={() => setError(null)} className="ml-2 underline font-bold uppercase text-[10px]">Clear</button>
            </div>
          )}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl border border-[#E4E6EB] overflow-hidden"
        >
          <div className="bg-[#1976D2] p-6 text-white flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">New Lead Found!</h2>
              <p className="text-white/80 text-sm">{scanResult.name}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <UserPlus className="w-6 h-6" />
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#F8F9FA] rounded-xl border border-[#E4E6EB]">
                <div className="text-[10px] text-[#606770] font-bold uppercase mb-1">School & Major</div>
                <div className="text-[14px] font-medium">{scanResult.school} - {scanResult.major || 'Undecided'}</div>
              </div>
              <div className="p-4 bg-[#F8F9FA] rounded-xl border border-[#E4E6EB]">
                <div className="text-[10px] text-[#606770] font-bold uppercase mb-1">Grad Year & Auth</div>
                <div className="text-[14px] font-medium">{scanResult.gradYear} / {scanResult.workAuth === 'authorized' ? '✅ Authorized' : '⚠️ Requires Sponsorship'}</div>
              </div>
              <div className="p-4 bg-[#F8F9FA] rounded-xl border border-[#E4E6EB]">
                <div className="text-[10px] text-[#606770] font-bold uppercase mb-1">Email</div>
                <div className="text-[14px] font-medium">{scanResult.email}</div>
              </div>
              <div className="p-4 bg-[#F8F9FA] rounded-xl border border-[#E4E6EB]">
                <div className="text-[10px] text-[#606770] font-bold uppercase mb-1">Phone</div>
                <div className="text-[14px] font-medium">{scanResult.phone || 'N/A'}</div>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-[#606770] uppercase mb-2">Interaction Notes</label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What did you talk about? e.g. Interested in Biology, prospective athlete..."
                className="w-full p-4 bg-[#F8F9FA] border border-[#E4E6EB] rounded-xl focus:ring-2 focus:ring-[#1976D2] outline-none h-32 transition-all"
              />
            </div>

            <div className="flex gap-3">
              <button 
                onClick={handleSaveLead}
                disabled={saving}
                className="flex-grow py-3 bg-[#1976D2] text-white font-bold rounded-xl hover:bg-[#1565C0] transition-colors shadow-md flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Save Lead
              </button>
              <button 
                onClick={() => setScanResult(null)}
                className="px-6 py-3 bg-[#F0F2F5] text-[#606770] font-bold rounded-xl hover:bg-[#E4E6EB] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

const LeadDetailModal = ({ lead, onClose }: { lead: Lead | null, onClose: () => void }) => {
  if (!lead) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex p-4 items-center justify-center pointer-events-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative border border-[#E4E6EB]">
        <div className="sticky top-0 bg-white/90 backdrop-blur-md z-10 border-b border-[#E4E6EB] px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-[#1C1E21]">Lead Profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#F0F2F5] rounded-full text-[#606770] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-8">
          {/* Header Profile Section */}
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-24 h-24 bg-[#EEF2FF] rounded-2xl flex items-center justify-center text-[#4F46E5] text-3xl font-bold overflow-hidden border border-[#E4E6EB] shrink-0">
              {lead.studentPhotoUrl ? (
                <img src={lead.studentPhotoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                lead.studentName[0]
              )}
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-[#1C1E21]">{lead.studentName}</h1>
              <div className="text-[14px] text-[#606770]">{lead.studentSchool} {lead.studentGradYear && <span className="font-medium text-[#1976D2]">• Class of {lead.studentGradYear}</span>}</div>
              <div className="pt-2 flex flex-wrap gap-2">
                 {lead.studentMajor && (
                   <span className="px-2.5 py-1 bg-[#F0F2F5] text-[#1C1E21] text-[11px] font-bold rounded-lg border border-[#E4E6EB]">
                     {lead.studentMajor}
                   </span>
                 )}
                 {lead.studentIsAthlete && (
                   <span className="px-2.5 py-1 bg-[#E8F5E9] text-[#2E7D32] text-[11px] font-bold rounded-lg border border-[#2E7D32]/20">
                     Athlete ({lead.studentSport || 'Unknown'})
                   </span>
                 )}
                 {lead.studentWorkAuth && (
                   <span className={cn(
                     "px-2.5 py-1 text-[11px] font-bold rounded-lg border",
                     lead.studentWorkAuth === 'authorized' ? "bg-[#E8F5E9] text-[#2E7D32] border-[#2E7D32]/20" : "bg-[#FFF3E0] text-[#E65100] border-[#E65100]/20"
                   )}>
                     {lead.studentWorkAuth === 'authorized' ? 'Work Authorized' : 'Needs Sponsorship'}
                   </span>
                 )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Info */}
            <div className="bg-[#F8F9FA] rounded-xl p-5 border border-[#E4E6EB] space-y-4">
               <h3 className="text-[11px] font-bold text-[#606770] uppercase tracking-wider">Contact Information</h3>
               
               <div className="space-y-3">
                 <div className="flex items-start gap-3 text-[13px] text-[#1C1E21]">
                   <Mail className="w-4 h-4 text-[#606770] mt-0.5 shrink-0" />
                   <div>
                     <div className={cn("break-all", lead.studentPreferredContact === 'email' && "font-bold text-[#1976D2]")}>
                       {lead.studentEmail}
                     </div>
                     {lead.studentPreferredContact === 'email' && <div className="text-[10px] text-[#1976D2] uppercase font-bold mt-0.5">Preferred Contact</div>}
                   </div>
                 </div>
                 
                 {lead.studentPhone && (
                   <div className="flex items-start gap-3 text-[13px] text-[#1C1E21]">
                     <Phone className="w-4 h-4 text-[#606770] mt-0.5 shrink-0" />
                     <div>
                       <div className={cn(lead.studentPreferredContact === 'phone' && "font-bold text-[#1976D2]")}>
                         {lead.studentPhone}
                       </div>
                       {lead.studentPreferredContact === 'phone' && <div className="text-[10px] text-[#1976D2] uppercase font-bold mt-0.5">Preferred Contact</div>}
                     </div>
                   </div>
                 )}
                 
                 {lead.studentLinkedin && (
                   <div className="flex items-start gap-3 text-[13px] text-[#1C1E21]">
                     <Linkedin className="w-4 h-4 text-[#606770] mt-0.5 shrink-0" />
                     <a href={lead.studentLinkedin} target="_blank" rel="noopener noreferrer" className="text-[#1976D2] hover:underline break-all">
                       {lead.studentLinkedin}
                     </a>
                   </div>
                 )}
               </div>
            </div>

            {/* Application Links */}
            <div className="bg-[#F8F9FA] rounded-xl p-5 border border-[#E4E6EB] space-y-4">
              <h3 className="text-[11px] font-bold text-[#606770] uppercase tracking-wider">Professional Application</h3>
              <div className="space-y-3">
                {lead.studentResumeUrl ? (
                  <a href={lead.studentResumeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-white border border-[#E4E6EB] rounded-lg hover:border-[#1976D2] hover:shadow-sm transition-all group">
                    <FileText className="w-4 h-4 text-[#606770] group-hover:text-[#1976D2]" />
                    <span className="text-[13px] font-bold text-[#1C1E21] group-hover:text-[#1976D2]">View Resume Document</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#606770] ml-auto group-hover:text-[#1976D2]" />
                  </a>
                ) : (
                  <div className="p-3 bg-white border border-[#E4E6EB] border-dashed rounded-lg text-center text-[#606770] text-[12px]">
                    No resume provided
                  </div>
                )}
                
                <div className="pt-2">
                   <div className="text-[11px] font-bold text-[#606770] uppercase mb-2">Interests</div>
                   <div className="flex flex-wrap gap-1.5">
                     {lead.studentInterests && lead.studentInterests.length > 0 ? lead.studentInterests.map(interest => (
                       <span key={interest} className="px-2 py-1 bg-white border border-[#E4E6EB] text-[#1C1E21] text-[11px] rounded-md">
                         {interest}
                       </span>
                     )) : (
                       <span className="text-[12px] text-[#606770] italic">Not specified</span>
                     )}
                   </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Internal Notes */}
          <div className="bg-[#FFF8E1] rounded-xl p-5 border border-[#FFE082]">
            <h3 className="text-[11px] font-bold text-[#F57F17] uppercase tracking-wider flex items-center gap-2 mb-3">
              <MessageSquare className="w-3.5 h-3.5" />
              Recruiter Notes
            </h3>
            {lead.notes ? (
              <p className="text-[13px] text-[#424242] whitespace-pre-wrap leading-relaxed">{lead.notes}</p>
            ) : (
              <p className="text-[12px] text-[#9E9E9E] italic">No notes recorded during scan.</p>
            )}
            
            <div className="mt-4 pt-4 border-t border-[#FFE082]/50 text-[10px] text-[#757575] flex justify-between items-center">
              <span>Scanned on {format(new Date(lead.scannedAt), 'MMMM d, yyyy ')} at {format(new Date(lead.scannedAt), 'h:mm a')}</span>
              <span>Event ID: {lead.eventId.slice(0, 8)}...</span>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

const LeadsList = ({ user }: { user: AppUser }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<'scannedAt' | 'studentName' | 'studentSchool'>('scannedAt');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [recruiterFilter, setRecruiterFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    const q = user.role === 'admin' 
      ? query(collection(db, 'leads'))
      : query(collection(db, 'leads'), where('recruiterId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
      setLeads(fetched);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'leads');
    });
    return unsubscribe;
  }, [user]);

  const uniqueRecruiters: string[] = user.role === 'admin' 
    ? Array.from(new Set(leads.map(l => l.recruiterId))) 
    : [];

  const filteredAndSortedLeads = leads
    .filter(l => recruiterFilter === 'all' || l.recruiterId === recruiterFilter)
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'studentName') {
        comparison = a.studentName.localeCompare(b.studentName);
      } else if (sortField === 'studentSchool') {
        const schoolA = a.studentSchool || 'Z'; // Push empty to bottom if sorting A-Z
        const schoolB = b.studentSchool || 'Z';
        comparison = schoolA.localeCompare(schoolB);
      } else {
        const dateA = new Date(a.scannedAt).getTime();
        const dateB = new Date(b.scannedAt).getTime();
        comparison = dateA - dateB;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  const downloadCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'School', 'Major', 'Grad Year', 'Work Auth', 'Athlete', 'Sport', 'Interests', 'Resume URL', 'Preferred Contact', 'Notes', 'Scanned At'];
    const rows = filteredAndSortedLeads.map(l => [
      l.studentName,
      l.studentEmail,
      l.studentPhone || 'N/A',
      l.studentSchool,
      l.studentMajor || 'N/A',
      l.studentGradYear || 'N/A',
      l.studentWorkAuth || 'authorized',
      l.studentIsAthlete ? 'Yes' : 'No',
      l.studentSport || 'N/A',
      l.studentInterests?.join(', ') || 'N/A',
      l.studentResumeUrl || 'N/A',
      l.studentPreferredContact || 'email',
      l.notes?.replace(/,/g, ';') || '',
      format(new Date(l.scannedAt), 'yyyy-MM-dd HH:mm')
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `expo_leads_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalLeads = filteredAndSortedLeads.length;
  const uniqueSchools = new Set(filteredAndSortedLeads.map(l => l.studentSchool).filter(Boolean)).size;
  const athleteCount = filteredAndSortedLeads.filter(l => l.studentIsAthlete).length;

  const schoolCounts = filteredAndSortedLeads.reduce((acc, lead) => {
    const school = lead.studentSchool || 'Unknown';
    acc[school] = (acc[school] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const schoolChartData = Object.entries(schoolCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5 schools

  const gradYearCounts = filteredAndSortedLeads.reduce((acc, lead) => {
    const year = lead.studentGradYear || 'Unknown';
    acc[year] = (acc[year] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const gradYearChartData = Object.entries(gradYearCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const COLORS = ['#1976D2', '#D32F2F', '#F57F17', '#388E3C', '#7B1FA2', '#0288D1'];

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#D32F2F]" /></div>;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E4E6EB] flex flex-col justify-center">
          <div className="text-[12px] font-bold text-[#606770] uppercase mb-1">Total Scans</div>
          <div className="text-3xl font-bold text-[#1C1E21]">{totalLeads}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E4E6EB] flex flex-col justify-center">
          <div className="text-[12px] font-bold text-[#606770] uppercase mb-1">Unique Schools</div>
          <div className="text-3xl font-bold text-[#1976D2]">{uniqueSchools}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E4E6EB] flex flex-col justify-center">
          <div className="text-[12px] font-bold text-[#606770] uppercase mb-1">Athletes Captured</div>
          <div className="text-3xl font-bold text-[#E65100]">{athleteCount}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E4E6EB]">
          <h3 className="text-[12px] font-bold text-[#606770] uppercase mb-4">Top 5 Schools Represented</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={schoolChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F2F5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#606770' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#606770' }} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#F8F9FA' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E4E6EB', fontSize: '12px' }} />
                <Bar dataKey="count" fill="#1976D2" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E4E6EB]">
          <h3 className="text-[12px] font-bold text-[#606770] uppercase mb-4">Class Year Breakdown</h3>
          <div className="h-64 w-full flex items-center justify-center">
            {gradYearChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gradYearChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {gradYearChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E4E6EB', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-[12px] text-[#606770] italic">No graduation year data available</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1C1E21]">Captured Leads</h2>
          <p className="text-sm text-[#606770]">{filteredAndSortedLeads.length} students captured</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {user.role === 'admin' && (
            <select
              value={recruiterFilter}
              onChange={(e) => setRecruiterFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-[#E4E6EB] text-[#1C1E21] text-[13px] rounded-lg outline-none focus:border-[#1976D2]"
            >
              <option value="all">All Recruiters</option>
              {uniqueRecruiters.map(uid => (
                <option key={uid} value={uid}>Recruiter: {uid.slice(0, 5)}...</option>
              ))}
            </select>
          )}
          <select
            value={`${sortField}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortField(field as any);
              setSortOrder(order as any);
            }}
            className="px-3 py-2 bg-white border border-[#E4E6EB] text-[#1C1E21] text-[13px] rounded-lg outline-none focus:border-[#1976D2]"
          >
            <option value="scannedAt-desc">Newest First</option>
            <option value="scannedAt-asc">Oldest First</option>
            <option value="studentName-asc">Name (A-Z)</option>
            <option value="studentName-desc">Name (Z-A)</option>
            <option value="studentSchool-asc">School (A-Z)</option>
            <option value="studentSchool-desc">School (Z-A)</option>
          </select>
          {filteredAndSortedLeads.length > 0 && (
            <button 
              onClick={downloadCSV}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E4E6EB] text-[#1C1E21] text-[13px] font-bold rounded-lg hover:bg-[#F8F9FA] transition-all shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAndSortedLeads.map(lead => (
          <div 
            key={lead.id} 
            onClick={() => setSelectedLead(lead)}
            className="bg-white p-5 rounded-2xl shadow-sm border border-[#E4E6EB] hover:shadow-md transition-all group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-[#EEF2FF] rounded-full flex items-center justify-center text-[#4F46E5] font-bold overflow-hidden border border-[#E4E6EB]">
                {lead.studentPhotoUrl ? (
                  <img src={lead.studentPhotoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  lead.studentName[0]
                )}
              </div>
              <div className="text-[10px] text-[#606770] font-medium">
                {format(new Date(lead.scannedAt), 'MMM dd, h:mm a')}
              </div>
            </div>
            
            <h3 className="font-bold text-[#1C1E21]">{lead.studentName}</h3>
            <div className="text-[12px] text-[#606770] mb-2 truncate">{lead.studentSchool}</div>
            
            <div className="flex flex-wrap gap-1.5 mb-3">
              {lead.studentMajor && (
                <span className="px-2 py-0.5 bg-[#F0F2F5] text-[#1C1E21] text-[10px] font-bold rounded border border-[#E4E6EB]">
                  {lead.studentMajor}
                </span>
              )}
              {lead.studentIsAthlete && (
                <span className="px-2 py-0.5 bg-[#E8F5E9] text-[#2E7D32] text-[10px] font-bold rounded border border-[#2E7D32]/20">
                  Athlete ({lead.studentSport || 'Unknown'})
                </span>
              )}
              {lead.studentWorkAuth && (
                <span className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded border",
                  lead.studentWorkAuth === 'authorized' ? "bg-[#E8F5E9] text-[#2E7D32] border-[#2E7D32]/20" : "bg-[#FFF3E0] text-[#E65100] border-[#E65100]/20"
                )}>
                  {lead.studentWorkAuth === 'authorized' ? 'Work Authorized' : 'Needs Sponsorship'}
                </span>
              )}
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-[12px] text-[#1C1E21]">
                <Mail className="w-3.5 h-3.5 text-[#606770]" />
                <span className={cn(lead.studentPreferredContact === 'email' && "font-bold text-[#1976D2]")}>
                  {lead.studentEmail}
                </span>
              </div>
              {lead.studentPhone && (
                <div className="flex items-center gap-2 text-[12px] text-[#1C1E21]">
                  <Phone className="w-3.5 h-3.5 text-[#606770]" />
                  <span className={cn(lead.studentPreferredContact === 'phone' && "font-bold text-[#1976D2]")}>
                    {lead.studentPhone}
                  </span>
                </div>
              )}
              {lead.studentLinkedin && (
                <div className="flex items-center gap-2 text-[12px] text-[#1C1E21] mb-2">
                  <Linkedin className="w-3.5 h-3.5 text-[#606770]" />
                  <a href={lead.studentLinkedin} target="_blank" rel="noopener noreferrer" className={cn("hover:underline", lead.studentPreferredContact === 'linkedin' && "font-bold text-[#1976D2]")}>
                    View LinkedIn
                  </a>
                </div>
              )}
              {lead.studentResumeUrl && (
                <a 
                  href={lead.studentResumeUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[12px] text-[#1976D2] font-bold hover:underline"
                >
                  <FileText className="w-3.5 h-3.5 animate-pulse" />
                  View Scannable Resume
                </a>
              )}
            </div>

            {lead.notes && (
              <div className="p-3 bg-[#F8F9FA] rounded-xl text-[11px] text-[#606770] italic border border-[#E4E6EB]">
                "{lead.notes}"
              </div>
            )}
          </div>
        ))}
      </div>

      {leads.length === 0 && (
        <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-[#E4E6EB]">
          <div className="w-16 h-16 bg-[#F8F9FA] rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-[#606770] opacity-20" />
          </div>
          <p className="text-[#606770] italic">No leads captured yet. Start scanning to see them here.</p>
        </div>
      )}

      <LeadDetailModal
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
      />
    </div>
  );
};

const VenueInteractiveMap = ({ event, sponsors = [] }: { event: ExpoEvent, sponsors?: Sponsor[] }) => {
  const [mapType, setMapType] = useState<'real' | 'booth'>('real');
  
  // Coordinates for some cities
  const cityCoords: Record<string, [number, number]> = {
    'Los Angeles': [34.0403, -118.2694], // LA Convention Center
    'Atlanta': [33.7592, -84.3916], // Georgia World Congress Center
    'Miami': [25.7907, -80.1300], // Miami Beach Convention Center
    'New York': [40.7586, -74.0019], // Javits Center
    'Dallas': [32.7753, -96.7997], // Kay Bailey Hutchison Convention Center
    'Houston': [29.7516, -95.3587], // George R. Brown Convention Center
    'Chicago': [41.8488, -87.6163], // McCormick Place
    'Washington DC': [38.9039, -77.0232], // Walter E. Washington Convention Center
    'Howard': [38.9227, -77.0194], // Howard University
    'Maryland': [39.2858, -76.6170], // Baltimore Convention Center
    'Oakland': [37.8044, -122.2711], // Oakland Convention Center
    'Detroit': [42.3286, -83.0485], // Huntington Place
  };

  const center = cityCoords[event.city] || [39.8283, -98.5795]; // Default US center

  if (mapType === 'booth' && (event.mapUrl || event.floorPlanUrl)) {
    const bounds: L.LatLngBoundsExpression = [[0, 0], [1000, 1000]];
    
    return (
      <div className="h-full w-full relative bg-[#F0F2F5] rounded overflow-hidden shadow-inner border border-[#E4E6EB]">
        <div className="absolute top-2 right-2 z-[1000] flex flex-col gap-2">
          <button 
            onClick={() => setMapType('real')}
            className="bg-white text-[10px] font-bold px-3 py-1.5 rounded shadow-sm hover:bg-[#F0F2F5] border border-[#E4E6EB]"
          >
            Switch to Street Map
          </button>
        </div>
        <MapContainer 
          crs={L.CRS.Simple} 
          bounds={bounds} 
          style={{ height: '100%', width: '100%' }}
          attributionControl={false}
        >
          <ImageOverlay url={event.floorPlanUrl || event.mapUrl || ''} bounds={bounds} />
          {PLACEHOLDER_BOOTHS.map((booth) => {
            const boothSponsors = sponsors.filter(s => s.boothId === booth.id);
            const sponsorHtml = boothSponsors.length > 0 
              ? `<div style="display: flex; gap: 2px;">${boothSponsors.map(s => `<img src="${s.logoUrl}" style="width: 24px; height: 24px; border-radius: 4px; object-fit: contain; background: white; border: 1px solid #E4E6EB; box-shadow: 0 1px 2px rgba(0,0,0,0.1);" />`).join('')}</div>`
              : `<div style="background-color: ${booth.type === 'stage' ? '#D32F2F' : booth.type === 'service' ? '#606770' : '#1976D2'}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`;

            return (
              <Marker 
                key={booth.id} 
                position={[booth.y, booth.x]}
                icon={L.divIcon({
                  className: 'custom-div-icon',
                  html: sponsorHtml,
                  iconSize: boothSponsors.length > 0 ? [24 * boothSponsors.length + (2 * (boothSponsors.length - 1)), 24] : [12, 12],
                  iconAnchor: boothSponsors.length > 0 ? [(24 * boothSponsors.length + (2 * (boothSponsors.length - 1))) / 2, 12] : [6, 6]
                })}
              >
                <Popup>
                  <div className="p-2 min-w-[150px]">
                    <div className="font-bold text-[14px] text-[#1C1E21]">{booth.name}</div>
                    <div className="flex items-center gap-1.5 mt-1 mb-2">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase",
                        booth.type === 'stage' ? "bg-[#FFF5F5] text-[#D32F2F] border border-[#FFEBEE]" :
                        booth.type === 'booth' ? "bg-[#E3F2FD] text-[#1976D2] border border-[#BBDEFB]" :
                        "bg-[#F5F5F5] text-[#606770] border border-[#EEEEEE]"
                      )}>
                        {booth.type}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#606770] leading-relaxed">
                      {booth.description}
                    </div>
                    {boothSponsors.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-[#F0F2F5]">
                        <div className="text-[10px] font-bold text-[#606770] uppercase mb-1">Sponsored By:</div>
                        <div className="flex flex-col gap-1.5">
                          {boothSponsors.map(s => (
                            <div key={s.id} className="flex items-center gap-2">
                              {s.logoUrl ? (
                                <img src={s.logoUrl} alt={s.name} className="w-6 h-6 object-contain rounded border border-[#E4E6EB]" />
                              ) : (
                                <div className="w-6 h-6 rounded bg-gray-100 border flex items-center justify-center">
                                  <span className="text-[8px] font-bold">Logo</span>
                                </div>
                              )}
                              <span className="text-[12px] font-medium">{s.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative rounded overflow-hidden border border-[#E4E6EB]">
      {(event.mapUrl || event.floorPlanUrl) && (
        <div className="absolute top-2 right-2 z-[1000] flex flex-col gap-2">
          <button 
            onClick={() => setMapType('booth')}
            className="bg-white text-[10px] font-bold px-3 py-1.5 rounded shadow-sm hover:bg-[#F0F2F5] border border-[#E4E6EB]"
          >
            {event.floorPlanUrl ? 'View Floor Plan' : 'View Booth Layout'}
          </button>
        </div>
      )}
      <MapContainer 
        center={center as L.LatLngExpression} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={center as L.LatLngExpression}>
          <Popup>
            <div className="p-1">
              <div className="font-bold text-[13px]">{event.name}</div>
              <div className="text-[11px] font-medium text-[#D32F2F]">{event.location}</div>
              <div className="text-[10px] text-gray-500 italic mt-1">{event.city} Convention Venue</div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

const EventDetails = ({ event, onBack, onEdit }: { event: ExpoEvent, onBack: () => void, onEdit?: (event: ExpoEvent) => void }) => {
  const { user } = useContext(UserContext);
  const [seminars, setSeminars] = useState<Seminar[]>([]);
  const [timeFilter, setTimeFilter] = useState('');
  const [speakerFilter, setSpeakerFilter] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  
  // Feedback State
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [showRegisterConfirm, setShowRegisterConfirm] = useState(false);
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [expandedSeminarId, setExpandedSeminarId] = useState<string | null>(null);
  const [activeSeminarCalendarId, setActiveSeminarCalendarId] = useState<string | null>(null);
  const [selectedSeminarForModal, setSelectedSeminarForModal] = useState<Seminar | null>(null);
  const [loadingSeminars, setLoadingSeminars] = useState(true);
  const [loadingFeedback, setLoadingFeedback] = useState(true);
  const [loadingRegistration, setLoadingRegistration] = useState(true);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loadingSponsors, setLoadingSponsors] = useState(true);
  const [updates, setUpdates] = useState<EventUpdate[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(true);
  const [eventRegistrants, setEventRegistrants] = useState<any[]>([]);
  const [loadingEventRegistrants, setLoadingEventRegistrants] = useState(false);
  const [editingReg, setEditingReg] = useState<any | null>(null);
  const [updatingRegStatus, setUpdatingRegStatus] = useState(false);

  useEffect(() => {
    setLoadingUpdates(true);
    const updatesRef = collection(db, 'events', event.id, 'updates');
    const q = query(updatesRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EventUpdate))
        .filter(u => !u.targetAudience || u.targetAudience === 'all' || u.targetAudience === user?.role);
      setUpdates(fetched);
      setLoadingUpdates(false);
    }, (err) => {
      console.error("Updates fetch error:", err);
      setLoadingUpdates(false);
    });
    return () => unsubscribe();
  }, [event.id]);

  useEffect(() => {
    setLoadingSponsors(true);
    const sponsorsRef = collection(db, 'events', event.id, 'sponsors');
    const q = query(sponsorsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sponsor));
      setSponsors(fetched);
      setLoadingSponsors(false);
    }, (err) => {
      console.error("Sponsor fetch error:", err);
      setLoadingSponsors(false);
    });
    return () => unsubscribe();
  }, [event.id]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    
    setLoadingEventRegistrants(true);
    const q = query(
      collectionGroup(db, 'registrations'),
      where('eventId', '==', event.id),
      orderBy('registeredAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        path: doc.ref.path,
        ...doc.data() 
      }));
      setEventRegistrants(fetched);
      setLoadingEventRegistrants(false);
    }, (err) => {
      console.error(err);
      setLoadingEventRegistrants(false);
    });
    
    return () => unsubscribe();
  }, [event.id, user?.role]);

  useEffect(() => {
    setLoadingFeedback(true);
    const q = query(collection(db, 'events', event.id, 'feedback'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback));
      setFeedbacks(fetched);
      setLoadingFeedback(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'feedback');
      setLoadingFeedback(false);
    });
    return () => unsubscribe();
  }, [event.id]);

  useEffect(() => {
    setLoadingSeminars(true);
    const seminarsRef = collection(db, 'events', event.id, 'seminars');
    const q = user?.role === 'admin' 
      ? query(seminarsRef, orderBy('time', 'asc'))
      : query(seminarsRef, where('status', '==', 'published'), orderBy('time', 'asc'));
      
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Seminar));
      setSeminars(fetched);
      setLoadingSeminars(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'seminars');
      setLoadingSeminars(false);
    });
    return () => unsubscribe();
  }, [event.id]);

  useEffect(() => {
    if (!user) {
      setLoadingRegistration(false);
      return;
    }
    setLoadingRegistration(true);
    const unsubscribe = onSnapshot(doc(db, `users/${user.uid}/registrations`, event.id), (doc) => {
      setIsRegistered(doc.exists());
      setLoadingRegistration(false);
    }, (err) => {
      console.error(err);
      setLoadingRegistration(false);
    });
    return () => unsubscribe();
  }, [user, event.id]);

  const handleRegister = async () => {
    if (!user) return alert('Please sign in to register');
    setRegistering(true);
    try {
      await setDoc(doc(db, `users/${user.uid}/registrations`, event.id), {
        eventId: event.id,
        eventName: event.name,
        userName: user.displayName,
        userEmail: user.email,
        registeredAt: new Date().toISOString(),
        status: 'confirmed'
      });
      alert('Successfully registered for ' + event.name);
      setShowRegisterConfirm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'registrations');
    } finally {
      setRegistering(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!user) return alert('Please sign in to leave feedback');
    if (!rating) return alert('Please select a rating');
    
    setSubmittingFeedback(true);
    try {
      await addDoc(collection(db, 'events', event.id, 'feedback'), {
        userId: user.uid,
        userName: user.displayName,
        rating,
        comment,
        createdAt: new Date().toISOString()
      });
      setComment('');
      setRating(5);
      alert('Thank you for your feedback!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleUpdateRegStatus = async (path: string, newStatus: string) => {
    setUpdatingRegStatus(true);
    try {
      await updateDoc(doc(db, path), { status: newStatus });
      setEditingReg(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setUpdatingRegStatus(false);
    }
  };

  const filteredSeminars = seminars.filter(s => 
    s.time.toLowerCase().includes(timeFilter.toLowerCase()) &&
    s.speaker.toLowerCase().includes(speakerFilter.toLowerCase())
  );

  const calendarLinks = getCalendarLinks(event);
  const shareLinks = getShareLinks(event);

  return (
    <>
      {/* Seminar Detail Modal */}
      <AnimatePresence>
        {selectedSeminarForModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-xl w-full border border-[#E4E6EB]"
            >
              <div className="relative h-36 bg-gradient-to-br from-[#1976D2] via-[#1565C0] to-[#0D47A1] p-8">
                <button 
                  onClick={() => setSelectedSeminarForModal(null)}
                  className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors border border-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="mt-4 flex flex-col gap-2">
                  <div className="inline-block self-start px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase tracking-widest border border-white/20">
                    {selectedSeminarForModal.category || 'Session'}
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight leading-tight">
                    {selectedSeminarForModal.title}
                  </h3>
                </div>
              </div>

              <div className="p-8 bg-white rounded-t-3xl -mt-6 relative">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="flex items-center gap-3 p-4 bg-[#F8F9FA] rounded-2xl border border-[#F0F2F5]">
                    <div className="w-10 h-10 rounded-full bg-[#E3F2FD] flex items-center justify-center font-black text-[#1976D2]">
                      {selectedSeminarForModal.speaker?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase text-[#606770] mb-0.5">Speaker</span>
                      <span className="text-[14px] font-black text-[#1C1E21]">{selectedSeminarForModal.speaker || 'Guest Speaker'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-[#F8F9FA] rounded-2xl border border-[#F0F2F5]">
                    <div className="w-10 h-10 rounded-full bg-[#FFF3E0] flex items-center justify-center">
                      <Clock className="w-5 h-5 text-[#E65100]" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase text-[#606770] mb-0.5">Time</span>
                      <span className="text-[14px] font-black text-[#1C1E21]">{selectedSeminarForModal.time}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <section>
                    <h4 className="text-[11px] font-bold uppercase text-[#606770] mb-3 flex items-center gap-2">
                      <Info className="w-4 h-4 text-[#1976D2]" />
                      Session Description
                    </h4>
                    <div className="text-[15px] text-[#4B4F56] leading-relaxed bg-[#F8F9FA] p-6 rounded-2xl border border-[#F0F2F5] min-h-[100px]">
                      {selectedSeminarForModal.description ? (
                        selectedSeminarForModal.description
                      ) : (
                        <span className="italic opacity-60">Join us for an informative deep dive into {selectedSeminarForModal.title}. Our speakers will cover key insights and practical takeaways.</span>
                      )}
                    </div>
                  </section>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[#F0F2F5] rounded-xl border border-[#E4E6EB]">
                      <span className="block text-[10px] font-bold uppercase text-[#606770] mb-1">Room / Location</span>
                      <div className="flex items-center gap-2 text-[14px] font-black text-[#1C1E21]">
                        <MapIcon className="w-4 h-4 text-[#1976D2]" />
                        {selectedSeminarForModal.room}
                      </div>
                    </div>
                    <div className="p-4 bg-[#F0F2F5] rounded-xl border border-[#E4E6EB]">
                      <span className="block text-[10px] font-bold uppercase text-[#606770] mb-1">Session Info</span>
                      <div className="flex items-center gap-2 text-[14px] font-black text-[#1C1E21]">
                        <Users className="w-4 h-4 text-[#1976D2]" />
                        Open to All
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-[#F0F2F5] flex gap-3">
                    <button 
                      onClick={() => {
                        const links = getSeminarCalendarLinks(event, selectedSeminarForModal);
                        window.open(links.google, '_blank');
                      }}
                      className="flex-grow py-4 bg-[#1976D2] text-white font-bold rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-[#1976D2]/20"
                    >
                      <Calendar className="w-5 h-5" />
                      Add to Google Calendar
                    </button>
                    <button 
                      onClick={() => setSelectedSeminarForModal(null)}
                      className="px-8 py-4 bg-[#F0F2F5] text-[#1C1E21] font-bold rounded-2xl hover:bg-[#E4E6EB] transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg border border-[#E4E6EB] shadow-sm overflow-hidden flex flex-col h-full"
      >

      {/* Admin Registration Status Modal */}
      <AnimatePresence>
        {user?.role === 'admin' && editingReg && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full"
            >
              <h3 className="text-xl font-bold text-[#1C1E21] mb-2 tracking-tight">Update Registration</h3>
              <p className="text-[13px] text-[#606770] mb-6 leading-tight">
                Change status for <span className="font-bold text-[#1C1E21]">{editingReg.userName}</span>
              </p>
              
              <div className="space-y-3 mb-8">
                {['confirmed', 'pending', 'cancelled'].map(status => (
                  <button
                    key={status}
                    onClick={() => handleUpdateRegStatus(editingReg.path, status)}
                    disabled={updatingRegStatus}
                    className={cn(
                      "w-full py-3 px-4 rounded-xl border flex items-center justify-between font-bold text-[14px] transition-all",
                      editingReg.status === status 
                        ? (status === 'confirmed' ? "bg-[#2E7D32] text-white border-[#2E7D32]" : 
                           status === 'pending' ? "bg-[#E65100] text-white border-[#E65100]" :
                           "bg-[#D32F2F] text-white border-[#D32F2F]")
                        : "bg-white text-[#1C1E21] border-[#E4E6EB] hover:border-[#1976D2]"
                    )}
                  >
                    <span className="capitalize">{status}</span>
                    {editingReg.status === status && <CheckCircle className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setEditingReg(null)}
                className="w-full py-3 bg-[#F0F2F5] text-[#1C1E21] font-bold rounded-xl hover:bg-[#E4E6EB] transition-colors"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="p-6 border-b border-[#E4E6EB] flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <button 
              onClick={onBack}
              className="text-[11px] font-bold uppercase text-[#1976D2] flex items-center gap-1 hover:underline"
            >
              ← Back to Dashboard
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="text-[11px] font-bold uppercase text-[#606770] flex items-center gap-1 hover:text-[#1976D2] transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" /> Share Event
              </button>
              
              <AnimatePresence>
                {showShareMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute top-full left-0 mt-2 bg-white border border-[#E4E6EB] rounded-xl shadow-2xl z-20 overflow-hidden w-48"
                  >
                    <a 
                      href={shareLinks.twitter} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 text-[12px] text-[#1C1E21] hover:bg-[#F0F2F5] transition-colors"
                      onClick={() => setShowShareMenu(false)}
                    >
                      <Twitter className="w-4 h-4 text-[#1DA1F2]" />
                      <span>X (Twitter)</span>
                    </a>
                    <a 
                      href={shareLinks.facebook} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 text-[12px] text-[#1C1E21] hover:bg-[#F0F2F5] transition-colors border-t border-[#F0F2F5]"
                      onClick={() => setShowShareMenu(false)}
                    >
                      <Facebook className="w-4 h-4 text-[#1877F2]" />
                      <span>Facebook</span>
                    </a>
                    <a 
                      href={shareLinks.linkedin} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 text-[12px] text-[#1C1E21] hover:bg-[#F0F2F5] transition-colors border-t border-[#F0F2F5]"
                      onClick={() => setShowShareMenu(false)}
                    >
                      <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                      <span>LinkedIn</span>
                    </a>
                    <a 
                      href={shareLinks.email} 
                      className="flex items-center gap-3 px-4 py-3 text-[12px] text-[#1C1E21] hover:bg-[#F0F2F5] transition-colors border-t border-[#F0F2F5]"
                      onClick={() => setShowShareMenu(false)}
                    >
                      <Mail className="w-4 h-4 text-[#606770]" />
                      <span>Email</span>
                    </a>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {user?.role === 'admin' && onEdit && (
              <button 
                onClick={() => onEdit(event)}
                className="text-[11px] font-bold uppercase text-[#1976D2] flex items-center gap-1 hover:bg-[#E3F2FD] px-2 py-0.5 rounded transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Event
              </button>
            )}
          </div>
          <h2 className="text-3xl font-extrabold text-[#1C1E21] tracking-tight">{event.name}</h2>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1 text-[13px] text-[#606770]">
              <MapIcon className="w-4 h-4 text-[#D32F2F]" />
              {event.location}, {event.city}
            </div>
            <div className="flex items-center gap-1 text-[13px] text-[#606770]">
              <Calendar className="w-4 h-4 text-[#D32F2F]" />
              {format(new Date(event.date), 'PPPP')}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {loadingRegistration ? (
            <div className="px-6 py-2.5 bg-[#F0F2F5] rounded-lg flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-[#606770]" />
            </div>
          ) : isRegistered ? (
            <div className="bg-[#E8F5E9] px-4 py-2 rounded-lg text-center border border-[#4CAF50]/20">
              <span className="block text-[10px] font-bold text-[#2E7D32] uppercase italic">Ticket Reserved</span>
              <span className="text-[#1B5E20] font-bold text-lg flex items-center gap-1 justify-center">
                Confirmed
              </span>
            </div>
          ) : (
            <button 
              onClick={() => setShowRegisterConfirm(true)}
              disabled={registering}
              className="px-6 py-2.5 bg-[#D32F2F] text-white font-bold rounded-lg hover:bg-black transition-all shadow-sm disabled:opacity-50"
            >
              {registering ? 'Registering...' : 'Register for Expo'}
            </button>
          )}
          <div className="bg-[#F0F2F5] px-4 py-2 rounded-lg text-center border border-[#E4E6EB]">
            <span className="block text-[10px] font-bold text-[#606770] uppercase">Tickets</span>
            <span className="text-[#1C1E21] font-bold text-lg">Active</span>
          </div>
        </div>
      </div>

      {/* Registration Confirmation Modal */}
      <AnimatePresence>
        {showRegisterConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 bg-[#F0F2F5] text-[#1976D2] rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-[#1C1E21] mb-2 tracking-tight">Confirm Registration?</h3>
              <p className="text-[14px] text-[#606770] mb-8 leading-relaxed">
                You are about to register for the <span className="font-bold text-[#1C1E21]">{event.name}</span> in {event.city}. We'll reserve your ticket for the event date.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowRegisterConfirm(false)}
                  className="flex-grow py-3 bg-[#F0F2F5] text-[#1C1E21] font-bold rounded-xl hover:bg-[#E4E6EB] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRegister}
                  disabled={registering}
                  className="flex-grow py-3 bg-[#D32F2F] text-white font-bold rounded-xl hover:bg-black transition-all disabled:opacity-50"
                >
                  {registering ? 'Processing...' : 'Yes, Register'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        <div className="lg:col-span-2 space-y-6">
          {!loadingUpdates && updates.length > 0 && (
            <section className="space-y-3">
              {updates.map(update => (
                <div 
                  key={update.id} 
                  className={clsx(
                    "p-4 rounded-xl border flex items-start gap-4",
                    update.type === 'alert' ? "bg-[#FFEBEE] border-[#FFCDD2] text-[#B71C1C]" :
                    update.type === 'warning' ? "bg-[#FFF8E1] border-[#FFECB3] text-[#F57F17]" :
                    "bg-[#E3F2FD] border-[#BBDEFB] text-[#0D47A1]"
                  )}
                >
                  <div className="shrink-0 mt-0.5">
                    {update.type === 'alert' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                    {update.type === 'warning' && <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
                    {update.type === 'info' && <Info className="w-5 h-5 flex-shrink-0" />}
                  </div>
                  <div className="flex-grow">
                     <p className="text-[14px] font-bold sm:text-[15px]">{update.message}</p>
                     <p className="text-[10px] font-bold uppercase mt-1 opacity-70">
                       {format(new Date(update.createdAt), 'h:mm a')}
                     </p>
                  </div>
                </div>
              ))}
            </section>
          )}

          <section>
            <h3 className="text-[11px] font-bold uppercase text-[#606770] mb-3 border-b border-[#F0F2F5] pb-2">About the Event</h3>
            <p className="text-[14px] leading-relaxed text-[#1C1E21]">{event.description}</p>
          </section>

          {/* Sponsor Highlights */}
          <section className="bg-[#F8F9FA] rounded-3xl p-8 border border-[#E4E6EB]">
            <SponsorSection sponsors={sponsors} loading={loadingSponsors} />
          </section>

          <section>
            <div className="flex justify-between items-end mb-4 border-b border-[#F0F2F5] pb-2">
              <h3 className="text-[11px] font-bold uppercase text-[#606770]">Seminars & Workshops</h3>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#606770]" />
                  <input 
                    type="text"
                    placeholder="Filter speaker..."
                    value={speakerFilter}
                    onChange={(e) => setSpeakerFilter(e.target.value)}
                    className="pl-8 pr-3 py-1 bg-[#F0F2F5] rounded text-[11px] border border-transparent focus:border-[#1976D2] outline-none w-32 md:w-40"
                  />
                </div>
                <div className="relative">
                  <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#606770]" />
                  <input 
                    type="text"
                    placeholder="Filter time..."
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                    className="pl-8 pr-3 py-1 bg-[#F0F2F5] rounded text-[11px] border border-transparent focus:border-[#1976D2] outline-none w-28 md:w-32"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {loadingSeminars ? (
                <div className="py-12 flex flex-col items-center justify-center text-[#606770] bg-[#F8F9FA] rounded-xl border border-dashed border-[#E4E6EB]">
                  <Loader2 className="w-8 h-8 animate-spin mb-2 opacity-20" />
                  <p className="text-[13px] font-medium">Loading session details...</p>
                </div>
              ) : filteredSeminars.length > 0 ? (
                filteredSeminars.map((s) => {
                  const CategoryIcon = s.category === 'Scholarships' ? GraduationCap : 
                                     s.category === 'Admissions' ? CheckCircle : 
                                     s.category === 'Career Advice' ? Briefcase : UserIcon;

                  return (
                    <div 
                      key={s.id} 
                      className="flex gap-4 items-start p-4 hover:bg-[#F8F9FA] rounded-xl transition-all group border border-transparent hover:border-[#E4E6EB] hover:shadow-sm"
                    >
                      <div className="font-mono text-[11px] text-[#D32F2F] font-bold w-20 pt-1 shrink-0">{s.time}</div>
                      <div className="flex-grow">
                        <button 
                          onClick={() => setSelectedSeminarForModal(s)}
                          className="text-left group/btn transition-all block w-full"
                        >
                          <div className="text-[14px] font-black tracking-tight text-[#1C1E21] group-hover:text-[#1976D2] transition-colors leading-tight flex items-center gap-2">
                            <CategoryIcon className="w-4 h-4 text-[#606770] group-hover/btn:text-[#1976D2] transition-colors" />
                            {s.title}
                          </div>
                          {s.description && (
                            <p className="text-[12px] text-[#606770] line-clamp-1 mt-1 font-medium group-hover/btn:text-[#1C1E21] transition-colors">
                              {s.description}
                            </p>
                          )}
                        </button>
                        
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1 text-[11px] text-[#606770]">
                            <UserIcon className="w-3.5 h-3.5 opacity-40 shrink-0" />
                            <span className="font-bold">{s.speaker}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-[#606770]">
                            <MapIcon className="w-3.5 h-3.5 opacity-40 shrink-0" />
                            <span className="font-bold">{s.room}</span>
                          </div>
                          <div className="ml-auto flex items-center gap-4">
                             <div className="relative">
                               <button 
                                 onClick={() => setActiveSeminarCalendarId(activeSeminarCalendarId === s.id ? null : s.id)}
                                 className="text-[10px] font-black uppercase tracking-widest text-[#606770] hover:text-[#D32F2F] transition-colors flex items-center gap-1.5"
                               >
                                 <Calendar className="w-3 h-3" />
                                 Calendar
                               </button>
                               
                               <AnimatePresence>
                                 {activeSeminarCalendarId === s.id && (
                                   <motion.div 
                                     initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                     animate={{ opacity: 1, scale: 1, y: 0 }}
                                     exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                     className="absolute bottom-full right-0 mb-2 bg-white border border-[#E4E6EB] rounded-lg shadow-xl z-30 min-w-[140px] overflow-hidden"
                                   >
                                     {(() => {
                                       const semLinks = getSeminarCalendarLinks(event, s);
                                       return (
                                         <>
                                           <a 
                                             href={semLinks.google} 
                                             target="_blank" 
                                             rel="noopener noreferrer"
                                             className="flex items-center justify-between px-3 py-2.5 text-[11px] font-bold text-[#1C1E21] hover:bg-[#F0F2F5] transition-colors"
                                             onClick={() => setActiveSeminarCalendarId(null)}
                                           >
                                             Google Calendar
                                           </a>
                                           <a 
                                             href={semLinks.outlook} 
                                             target="_blank" 
                                             rel="noopener noreferrer"
                                             className="flex items-center justify-between px-3 py-2.5 text-[11px] font-bold text-[#1C1E21] hover:bg-[#F0F2F5] transition-colors border-t border-[#F0F2F5]"
                                             onClick={() => setActiveSeminarCalendarId(null)}
                                           >
                                             Outlook
                                           </a>
                                         </>
                                       );
                                     })()}
                                   </motion.div>
                                 )}
                               </AnimatePresence>
                             </div>

                             <button 
                               onClick={() => setSelectedSeminarForModal(s)}
                               className="text-[10px] font-black uppercase tracking-widest text-[#1976D2] hover:text-black transition-colors flex items-center gap-1"
                             >
                               View Details
                               <ChevronRight className="w-3 h-3" />
                             </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-[#606770] text-[13px] italic bg-[#F8F9FA] rounded-xl">
                  {seminars.length === 0 ? "No seminars scheduled yet for this event." : "No seminars match your filters."}
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-bold uppercase text-[#606770] mb-3 border-b border-[#F0F2F5] pb-2">Schedule Overview</h3>
            <div className="space-y-4">
              {[
                { time: '09:00 AM', label: 'Doors Open & Registration' },
                { time: '10:00 AM', label: 'Opening Ceremony' },
                { time: '11:00 AM', label: 'Seminar Session 1' },
                { time: '01:00 PM', label: 'Main Floor Interaction' },
                { time: '04:00 PM', label: 'Closing Remarks' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <div className="font-mono text-[11px] text-[#D32F2F] font-bold w-16">{item.time}</div>
                  <div className="text-[13px] font-semibold text-[#1C1E21]">{item.label}</div>
                </div>
              ))}
            </div>
          </section>

          {user?.role === 'admin' && (
            <section className="bg-white border border-[#E4E6EB] rounded-2xl overflow-hidden shadow-sm mt-8">
              <div className="p-5 border-b border-[#F0F2F5] flex justify-between items-center bg-[#F8F9FA]/50">
                <div>
                  <h3 className="text-[11px] font-bold uppercase text-[#1976D2] tracking-widest">Admin Controls</h3>
                  <h4 className="text-[15px] font-black text-[#1C1E21] mt-0.5">Event Registrants</h4>
                </div>
                <div className="px-3 py-1 bg-white border border-[#E4E6EB] rounded-full text-[10px] font-bold text-[#606770]">
                  {eventRegistrants.length} Total
                </div>
              </div>
              
              <div className="p-4">
                {loadingEventRegistrants ? (
                  <div className="py-12 flex flex-col items-center justify-center text-[#606770]">
                    <Loader2 className="w-6 h-6 animate-spin mb-2 opacity-20" />
                    <p className="text-[11px] font-bold uppercase tracking-widest">Fetching registrants...</p>
                  </div>
                ) : eventRegistrants.length === 0 ? (
                  <div className="py-12 text-center text-[13px] text-[#606770] italic">
                    No registrations recorded for this event yet.
                  </div>
                ) : (
                  <div className="overflow-hidden border border-[#F0F2F5] rounded-xl">
                    <table className="w-full text-left text-[12px]">
                      <thead className="bg-[#F8F9FA] text-[#606770] font-bold uppercase text-[9px] border-b border-[#F0F2F5]">
                        <tr>
                          <th className="px-4 py-3">User</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0F2F5]">
                        {eventRegistrants.map((reg, idx) => (
                          <tr key={idx} className="hover:bg-[#F8F9FA] transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-bold text-[#1C1E21]">{reg.userName || 'Anonymous'}</div>
                              <div className="text-[10px] text-[#606770] truncate max-w-[150px]">{reg.userEmail}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="relative inline-block w-full max-w-[120px]">
                                <select 
                                  value={reg.status || 'confirmed'} 
                                  onChange={(e) => handleUpdateRegStatus(reg.path, e.target.value)}
                                  disabled={updatingRegStatus}
                                  className={cn(
                                    "w-full pl-2 pr-6 py-1.5 rounded font-bold text-[9px] uppercase outline-none cursor-pointer appearance-none transition-all border shadow-sm",
                                    reg.status === 'confirmed' ? "bg-[#E8F5E9] text-[#2E7D32] border-[#2E7D32]/30" : 
                                    reg.status === 'pending' ? "bg-[#FFF3E0] text-[#E65100] border-[#E65100]/30" :
                                    "bg-[#FFF5F5] text-[#D32F2F] border-[#D32F2F]/30"
                                  )}
                                >
                                  <option value="confirmed">Confirmed</option>
                                  <option value="pending">Pending</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                  <ChevronRight className="w-2.5 h-2.5 rotate-90" />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-1">
                                <button 
                                  onClick={() => setEditingReg(reg)}
                                  className="p-1.5 text-[#1976D2] hover:bg-[#E3F2FD] rounded-lg transition-all"
                                  title="View Details"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={async () => {
                                    if (confirm(`Are you sure you want to delete the registration for ${reg.userName}?`)) {
                                      try {
                                        await deleteDoc(doc(db, reg.path));
                                        alert('Registration deleted.');
                                      } catch (err) {
                                        handleFirestoreError(err, OperationType.DELETE, reg.path);
                                      }
                                    }
                                  }}
                                  className="p-1.5 text-[#606770] hover:text-[#D32F2F] hover:bg-[#FFF5F5] rounded-lg transition-all"
                                  title="Delete Registration"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-[#F8F9FA] border border-[#E4E6EB] rounded-lg p-5">
            <h3 className="text-[11px] font-bold uppercase text-[#606770] mb-4">Venue Details</h3>
            <div className="aspect-square bg-white border border-[#E4E6EB] rounded overflow-hidden mb-4 relative h-[320px]">
              <VenueInteractiveMap event={event} sponsors={sponsors} />
            </div>
            {event.mapUrl ? (
              <a 
                href={event.mapUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                download={`HallMap_${event.city}.pdf`}
                className="w-full py-2.5 bg-[#1976D2] text-white text-[12px] font-bold rounded hover:bg-[#1565C0] transition-colors flex items-center justify-center gap-2"
              >
                Download Hall Map (PDF)
              </a>
            ) : (
              <button disabled className="w-full py-2.5 bg-[#E4E6EB] text-[#606770] text-[12px] font-bold rounded cursor-not-allowed">
                No Map Available
              </button>
            )}

            <div className="relative mt-2">
              <button 
                onClick={() => setShowCalendarMenu(!showCalendarMenu)}
                className="w-full py-2.5 bg-white border border-[#E4E6EB] text-[#1C1E21] text-[12px] font-bold rounded hover:bg-[#F0F2F5] transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Calendar className="w-3.5 h-3.5 text-[#D32F2F]" />
                Add to Calendar
              </button>
              
              <AnimatePresence>
                {showCalendarMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E4E6EB] rounded-xl shadow-2xl z-20 overflow-hidden"
                  >
                    <a 
                      href={calendarLinks.google} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-4 py-3 text-[12px] text-[#1C1E21] hover:bg-[#F0F2F5] transition-colors"
                      onClick={() => setShowCalendarMenu(false)}
                    >
                      <span>Google Calendar</span>
                      <ExternalLink className="w-3 h-3 opacity-30" />
                    </a>
                    <a 
                      href={calendarLinks.outlook} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-4 py-3 text-[12px] text-[#1C1E21] hover:bg-[#F0F2F5] transition-colors border-t border-[#F0F2F5]"
                      onClick={() => setShowCalendarMenu(false)}
                    >
                      <span>Outlook / Office 365</span>
                      <ExternalLink className="w-3 h-3 opacity-30" />
                    </a>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="bg-[#F8F9FA] border border-[#E4E6EB] rounded-lg p-5">
            <h3 className="text-[11px] font-bold uppercase text-[#606770] mb-4 border-b border-[#E4E6EB] pb-2">Feedback & Ratings</h3>
            <div className="space-y-4">
              {/* Star Rating Input */}
              <div className="bg-white p-4 rounded-lg border border-[#E4E6EB] shadow-sm">
                <label className="block text-[10px] font-bold uppercase text-[#606770] mb-2 text-center tracking-wider">Rate this Event</label>
                <div className="flex justify-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform active:scale-90"
                    >
                      <Star 
                        className={cn(
                          "w-5 h-5",
                          star <= rating ? "fill-[#FFB400] text-[#FFB400]" : "text-[#E4E6EB]"
                        )} 
                      />
                    </button>
                  ))}
                </div>
                <textarea 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience (optional)..."
                  className="w-full bg-[#F0F2F5] border border-transparent rounded-lg p-3 text-[12px] outline-none focus:border-[#1976D2] min-h-[60px] resize-none placeholder:text-[#606770]/50"
                />
                <button 
                  onClick={handleSubmitFeedback}
                  disabled={submittingFeedback}
                  className="w-full mt-3 py-2 bg-[#D32F2F] text-white font-bold rounded text-[11px] uppercase tracking-wide hover:bg-black transition-colors disabled:opacity-50"
                >
                  {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>

              {/* Feedback List */}
              <div className="pt-2">
                <h4 className="text-[10px] font-bold uppercase text-[#606770] mb-3">Community Opinions</h4>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {loadingFeedback ? (
                    <div className="py-12 flex flex-col items-center justify-center text-[#606770] bg-white border border-dashed border-[#E4E6EB] rounded-xl">
                      <Loader2 className="w-5 h-5 animate-spin mb-2 opacity-20" />
                      <p className="text-[10px] font-bold uppercase tracking-wider">Loading reviews...</p>
                    </div>
                  ) : feedbacks.length > 0 ? (
                    feedbacks.map((fb) => (
                      <div key={fb.id} className="bg-white p-3 rounded-lg border border-[#F0F2F5] shadow-sm hover:border-[#1976D2]/20 transition-colors">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-[11px] text-[#1C1E21]">{fb.userName}</span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} className={cn("w-2 h-2", s <= fb.rating ? "fill-[#FFB400] text-[#FFB400]" : "text-[#E4E6EB]")} />
                            ))}
                          </div>
                        </div>
                        {fb.comment && <p className="text-[12px] text-[#606770] leading-tight font-medium italic">"{fb.comment}"</p>}
                        <span className="text-[9px] text-[#A0A0A0] mt-1.5 block font-bold">
                          {format(new Date(fb.createdAt), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 bg-white border border-dashed border-[#E4E6EB] rounded-lg text-[#606770] text-[11px] italic">No reviews yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#FFF5F5] border border-[#D32F2F]/20 rounded-lg p-5">
            <h3 className="text-[11px] font-bold uppercase text-[#D32F2F] mb-2">Important Notice</h3>
            <p className="text-[12px] text-[#606770]">Please bring at least 10 copies of your transcripts if you are seeking on-the-spot admissions.</p>
          </div>
        </div>
      </div>
    </motion.div>
    </>
  );
};

const ProfileSettings = ({ user, onUpdate }: { user: AppUser, onUpdate: (data: Partial<AppUser>) => Promise<void> }) => {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [school, setSchool] = useState(user.school || '');
  const [graduationYear, setGraduationYear] = useState(user.graduationYear || '');
  const [major, setMajor] = useState(user.major || '');
  const [linkedin, setLinkedin] = useState(user.linkedin || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [resumeUrl, setResumeUrl] = useState(user.resumeUrl || '');
  const [workAuthorization, setWorkAuthorization] = useState(user.workAuthorization || 'authorized');
  const [preferredContact, setPreferredContact] = useState(user.preferredContact || 'email');
  const [interestInput, setInterestInput] = useState('');
  const [interests, setInterests] = useState<string[]>(user.interests || []);
  const [isAthlete, setIsAthlete] = useState<boolean>(user.isAthlete || false);
  const [sport, setSport] = useState(user.sport || '');
  const [saving, setSaving] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeProgress, setResumeProgress] = useState(0);

  const handleUpdateAuthProfile = async () => {
    try {
      await updateProfile(auth.currentUser!, { displayName, photoURL });
    } catch (e) {
      console.error("Auth profile update failed", e);
    }
  };

  const handleAddInterest = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && interestInput.trim()) {
      e.preventDefault();
      if (!interests.includes(interestInput.trim())) {
        setInterests([...interests, interestInput.trim()]);
      }
      setInterestInput('');
    }
  };

  const removeInterest = (tag: string) => {
    setInterests(interests.filter(i => i !== tag));
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert("File is too large. Please upload a PDF under 5MB.");
      return;
    }

    setUploadingResume(true);
    setResumeProgress(0);

    try {
      const storageRef = ref(storage, `resumes/${user.uid}_${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setResumeProgress(progress);
        },
        (error) => {
          console.error("Upload failed", error);
          setUploadingResume(false);
          alert("Resume upload failed. Please try again.");
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setResumeUrl(downloadURL);
          setUploadingResume(false);
        }
      );
    } catch (error) {
      console.error("Upload error", error);
      setUploadingResume(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await handleUpdateAuthProfile();
    await onUpdate({ 
      displayName, 
      photoURL,
      school, 
      graduationYear, 
      major, 
      interests, 
      linkedin, 
      phone, 
      resumeUrl, 
      workAuthorization, 
      preferredContact,
      isAthlete,
      sport
    });
    setSaving(false);
    alert('Profile updated successfully!');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto w-full space-y-6"
    >
      <div className="bg-white rounded-lg border border-[#E4E6EB] shadow-sm p-6 text-[14px]">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-[#F8F9FA] rounded-xl flex items-center justify-center p-1.5 border border-[#E4E6EB]">
            <img src={LOGO_URL} alt="NCRF" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <h2 className="text-xl font-bold text-[#1C1E21] tracking-tight">MY PROFILE SETTINGS</h2>
        </div>
        
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start border-b border-[#F0F2F5] pb-8">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-[#F8F9FA] border border-[#E4E6EB] overflow-hidden flex items-center justify-center relative">
                {photoURL ? (
                  <img src={photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon className="w-8 h-8 text-[#606770] opacity-20" />
                )}
              </div>
            </div>
            <div className="flex-grow space-y-4 w-full">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5">Profile Photo URL</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    className="flex-grow bg-[#F0F2F5] border border-transparent rounded px-4 py-2 outline-none focus:bg-white focus:border-[#1976D2] transition-all"
                    placeholder="https://..."
                  />
                  <div className="bg-[#F0F2F5] p-2 rounded flex items-center justify-center">
                    <Camera className="w-4 h-4 text-[#606770]" />
                  </div>
                </div>
                <p className="text-[10px] text-[#A0A0A0] mt-1 italic">Public URL to your image (.jpg, .png)</p>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5">Full Display Name</label>
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-[#F0F2F5] border border-transparent rounded px-4 py-2 outline-none focus:bg-white focus:border-[#1976D2] transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5">{user.role === 'student' ? 'School Name' : 'Organization'}</label>
              <input 
                type="text" 
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                className="w-full bg-[#F0F2F5] border border-transparent rounded px-4 py-2 outline-none focus:bg-white focus:border-[#1976D2] transition-all"
                placeholder={user.role === 'student' ? "e.g. University of..." : "e.g. NCRF Foundation"}
              />
            </div>
            {(user.role === 'student' || user.role === 'parent' || user.role === 'admin' || user.role === 'recruiter') && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5">LinkedIn Profile URL</label>
                    <input 
                      type="text" 
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2]"
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5">Phone Number</label>
                    <input 
                      type="text" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2]"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>

                {user.role === 'student' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5">Academic Major</label>
                      <input 
                        type="text" 
                        value={major}
                        onChange={(e) => setMajor(e.target.value)}
                        className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2]"
                        placeholder="e.g. Computer Science"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5">Graduation Year</label>
                      <input 
                        type="text" 
                        value={graduationYear}
                        onChange={(e) => setGraduationYear(e.target.value)}
                        className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2]"
                        placeholder="e.g. 2026"
                      />
                    </div>
                  </div>
                )}

                {user.role === 'student' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isAthlete}
                          onChange={(e) => setIsAthlete(e.target.checked)}
                          className="w-3.5 h-3.5"
                        />
                        Student Athlete
                      </label>
                      {isAthlete && (
                        <div className="mt-2">
                          <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5">Sport</label>
                          <select 
                            value={sport}
                            onChange={(e) => setSport(e.target.value)}
                            className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2]"
                          >
                            <option value="">Select Sport</option>
                            <option value="Football">Football</option>
                            <option value="Basketball">Basketball</option>
                            <option value="Baseball/Softball">Baseball/Softball</option>
                            <option value="Soccer">Soccer</option>
                            <option value="Track & Field">Track & Field</option>
                            <option value="Volleyball">Volleyball</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {user.role === 'student' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5">Work Authorization</label>
                      <select 
                        value={workAuthorization}
                        onChange={(e) => setWorkAuthorization(e.target.value as any)}
                        className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2]"
                      >
                        <option value="authorized">Legally Authorized to Work</option>
                        <option value="requires-sponsorship">Requires Visa Sponsorship</option>
                        <option value="not-authorized">Not Currently Authorized</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5">Preferred Contact</label>
                      <select 
                        value={preferredContact}
                        onChange={(e) => setPreferredContact(e.target.value as any)}
                        className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2]"
                      >
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="linkedin">LinkedIn</option>
                      </select>
                    </div>
                  </div>
                )}

                {user.role === 'student' && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5">Scannable Resume (PDF)</label>
                    <div className="flex flex-col md:flex-row gap-2">
                      <input 
                        type="text" 
                        value={resumeUrl}
                        onChange={(e) => setResumeUrl(e.target.value)}
                        className="flex-grow bg-[#F0F2F5] border border-[#E4E6EB] rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2]"
                        placeholder="Link to PDF (Google Drive, Dropbox, etc.) or Upload ->"
                      />
                      <label className="bg-[#E3F2FD] text-[#1976D2] border border-[#BBDEFB] rounded px-4 py-2 flex items-center justify-center gap-2 cursor-pointer font-semibold text-[13px] hover:bg-[#BBDEFB] transition-colors shrink-0">
                        <Upload className="w-4 h-4" />
                        {uploadingResume ? `Uploading ${Math.round(resumeProgress)}%` : 'Upload PDF'}
                        <input 
                          type="file" 
                          accept="application/pdf"
                          className="hidden" 
                          onChange={handleResumeUpload}
                          disabled={uploadingResume}
                        />
                      </label>
                    </div>
                    {resumeUrl && (
                      <div className="mt-2 text-[12px] flex items-center gap-2">
                        <span className="text-[#606770]">Current Resume:</span>
                        <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="text-[#1976D2] hover:underline font-medium select-all truncate max-w-[200px] md:max-w-md inline-block align-bottom">{resumeUrl}</a>
                      </div>
                    )}
                    <p className="text-[10px] text-[#606770] mt-1 italic">Link a public PDF of your resume, or upload a new one for recruiters to view.</p>
                  </div>
                )}
              </>
            )}
            
            {user.role === 'parent' && (
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5">Child's Graduation Year</label>
                <input 
                  type="text" 
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2]"
                  placeholder="e.g. 2026"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5">Areas of Interest</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {interests.map(tag => (
                <span key={tag} className="bg-[#E3F2FD] text-[#1976D2] text-[12px] font-bold px-2.5 py-1 rounded flex items-center gap-1.5">
                  {tag}
                  <button onClick={() => removeInterest(tag)} className="hover:text-[#D32F2F]">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input 
              type="text" 
              value={interestInput}
              onChange={(e) => setInterestInput(e.target.value)}
              onKeyDown={handleAddInterest}
              className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2]"
              placeholder="Technology, Arts, Nursing... (Press Enter to add)"
            />
          </div>

          <div className="pt-4 border-t border-[#F0F2F5]">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-[#D32F2F] text-white font-bold rounded hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#F8F9FA] rounded-lg border border-[#E4E6EB] p-5">
        <h3 className="text-[11px] font-bold uppercase text-[#606770] mb-2">Account Type</h3>
        <p className="text-[13px] font-bold text-[#1C1E21] capitalize">{user.role} Portal Access</p>
        <p className="text-[11px] text-[#606770] mt-1">Role-based permissions are fixed. Please contact support if you need to change your primary account role.</p>
      </div>
    </motion.div>
  );
};

// --- Constants ---
const LOGO_URL = "https://cdn.prod.website-files.com/597b2b2bb81a770001f1a5f7/645023e6c2a90181c3caadc0_6321388b64813e55c72d8a15_NCRF_Corp_Sheild_Address_Horiz-p-500.png";

const AdminEventManager = ({ events, initialEditEvent }: { events: ExpoEvent[], initialEditEvent?: ExpoEvent | null }) => {
  const { user } = useContext(UserContext);
  // Event Form State
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [city, setCity] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [floorPlanUrl, setFloorPlanUrl] = useState('');
  const [timezone, setTimezone] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  
  // Seminar Form State
  const [selectedEventId, setSelectedEventId] = useState('');
  const [sTitle, setSTitle] = useState('');
  const [sSpeaker, setSSpeaker] = useState('');
  const [sTime, setSTime] = useState('');
  const [sRoom, setSRoom] = useState('');
  const [sCategory, setSCategory] = useState('');
  const [sDescription, setSDescription] = useState('');
  const [editingSeminarId, setEditingSeminarId] = useState<string | null>(null);
  const [seminarsForSelectedEvent, setSeminarsForSelectedEvent] = useState<Seminar[]>([]);
  const [deletingSeminarId, setDeletingSeminarId] = useState<string | null>(null);
  const [loadingSeminars, setLoadingSeminars] = useState(false);
  
  // Sponsor Form State
  const [sponName, setSponName] = useState('');
  const [sponLogo, setSponLogo] = useState('');
  const [sponTier, setSponTier] = useState<Sponsor['tier']>('silver');
  const [sponUrl, setSponUrl] = useState('');
  const [sponDesc, setSponDesc] = useState('');
  const [sponBoothId, setSponBoothId] = useState<number | ''>('');
  const [editingSponsorId, setEditingSponsorId] = useState<string | null>(null);
  const [sponsorsForSelectedEvent, setSponsorsForSelectedEvent] = useState<Sponsor[]>([]);
  const [loadingSponsors, setLoadingSponsors] = useState(false);
  const [deletingSponsorId, setDeletingSponsorId] = useState<string | null>(null);
  const [sponsorErrors, setSponsorErrors] = useState<Record<string, string>>({});

  // Updates / Announcements State
  const [updateMsg, setUpdateMsg] = useState('');
  const [updateType, setUpdateType] = useState<EventUpdate['type']>('info');
  const [targetAudience, setTargetAudience] = useState<EventUpdate['targetAudience']>('all');
  const [updatesForSelectedEvent, setUpdatesForSelectedEvent] = useState<EventUpdate[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [deletingUpdateId, setDeletingUpdateId] = useState<string | null>(null);
  const [updateErrors, setUpdateErrors] = useState<Record<string, string>>({});

  // Registration List State
  const [targetEventForReport, setTargetEventForReport] = useState('');
  const [registrants, setRegistrants] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [editingReg, setEditingReg] = useState<any | null>(null);
  const [deletingReg, setDeletingReg] = useState<any | null>(null);
  const [eventErrors, setEventErrors] = useState<Record<string, string>>({});
  const [seminarErrors, setSeminarErrors] = useState<Record<string, string>>({});
  const [selectedSeminarIds, setSelectedSeminarIds] = useState<string[]>([]);
  const [selectedSponsorIds, setSelectedSponsorIds] = useState<string[]>([]);

  useEffect(() => {
    if (initialEditEvent) {
      handleEditInit(initialEditEvent);
    }
  }, [initialEditEvent]);

  useEffect(() => {
    if (!targetEventForReport) {
      setRegistrants([]);
      return;
    }

    setLoadingReport(true);
    // Use collectionGroup to find all registrations for this event across all users
    let q;
    const constraints: any[] = [];
    
    if (targetEventForReport !== 'all') {
      constraints.push(where('eventId', '==', targetEventForReport));
    }
    
    if (statusFilter !== 'all') {
      constraints.push(where('status', '==', statusFilter));
    }

    q = query(
      collectionGroup(db, 'registrations'),
      ...constraints,
      orderBy('registeredAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        path: doc.ref.path,
        ...doc.data() 
      }));
      setRegistrants(fetched);
      setLoadingReport(false);
    }, (err) => {
      console.error(err);
      setLoadingReport(false);
    });

    return () => unsubscribe();
  }, [targetEventForReport, statusFilter]);

  useEffect(() => {
    if (!selectedEventId) {
      setSeminarsForSelectedEvent([]);
      return;
    }
    setLoadingSeminars(true);
    const q = query(collection(db, 'events', selectedEventId, 'seminars'), orderBy('time', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Seminar));
      setSeminarsForSelectedEvent(fetched);
      setLoadingSeminars(false);
    }, (err) => {
      console.error(err);
      setLoadingSeminars(false);
    });
    return () => unsubscribe();
  }, [selectedEventId]);

  useEffect(() => {
    if (!selectedEventId) {
      setSponsorsForSelectedEvent([]);
      setUpdatesForSelectedEvent([]);
      return;
    }
    setLoadingSponsors(true);
    const qSponsors = query(collection(db, 'events', selectedEventId, 'sponsors'), orderBy('tier', 'asc'));
    const unsubscribeSponsors = onSnapshot(qSponsors, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sponsor));
      setSponsorsForSelectedEvent(fetched);
      setLoadingSponsors(false);
    }, (err) => {
      console.error(err);
      setLoadingSponsors(false);
    });

    setLoadingUpdates(true);
    const qUpdates = query(collection(db, 'events', selectedEventId, 'updates'), orderBy('createdAt', 'desc'));
    const unsubscribeUpdates = onSnapshot(qUpdates, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EventUpdate));
      setUpdatesForSelectedEvent(fetched);
      setLoadingUpdates(false);
    }, (err) => {
      console.error(err);
      setLoadingUpdates(false);
    });

    return () => {
      unsubscribeSponsors();
      unsubscribeUpdates();
    };
  }, [selectedEventId]);

  const handleExportCSV = () => {
    if (registrants.length === 0) return alert('No data to export');

    const headers = ['Name', 'Email', 'Event', 'Registered At', 'Status'];
    const rows = registrants.map(reg => [
      `"${reg.userName || 'Anonymous'}"`,
      `"${reg.userEmail || 'N/A'}"`,
      `"${reg.eventName || 'N/A'}"`,
      `"${reg.registeredAt ? format(new Date(reg.registeredAt), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}"`,
      `"${reg.status || 'confirmed'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const fileName = `Registrants_${targetEventForReport === 'all' ? 'All_Events' : 'Event'}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (user?.role !== 'admin') return null;

  const handleEditInit = (event: ExpoEvent) => {
    setEditingEventId(event.id);
    setName(event.name);
    setDate(event.date);
    setCity(event.city);
    setLocation(event.location);
    setDescription(event.description);
    setMapUrl(event.mapUrl || '');
    setFloorPlanUrl(event.floorPlanUrl || '');
    setTimezone(event.timezone || '');
    setIsEventModalOpen(true);
  };

  const handleCancelEdit = () => {
    setEditingEventId(null);
    setIsEventModalOpen(false);
    setName(''); setDate(''); setCity(''); setLocation(''); setDescription(''); setMapUrl(''); setFloorPlanUrl(''); setTimezone('');
  };

  const handleToggleEventStatus = async (event: ExpoEvent) => {
    try {
      const newStatus = event.status === 'published' ? 'draft' : 'published';
      await updateDoc(doc(db, 'events', event.id), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'events');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'events', id));
      setDeletingEventId(null);
      alert('Event deleted successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'events');
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const errors: Record<string, string> = {};
    if (!name) errors.name = 'Event name is required';
    if (!date) errors.date = 'Date is required';
    if (!city) errors.city = 'City is required';
    if (!location) errors.location = 'Venue location is required';
    if (!description) errors.description = 'Event description is required';
    
    if (Object.keys(errors).length > 0) {
      setEventErrors(errors);
      return;
    }
    
    setEventErrors({});
    setSaving(true);
    try {
      const eventData = {
        name,
        date,
        city,
        location,
        description,
        time: '9am - 4pm', // Default
        timezone,
        mapUrl,
        floorPlanUrl,
        status: 'published' as const,
        createdAt: new Date().toISOString()
      };

      if (editingEventId) {
        await updateDoc(doc(db, 'events', editingEventId), eventData);
        alert('Event launched successfully!');
        setEditingEventId(null);
      } else {
        await addDoc(collection(db, 'events'), eventData);
        alert('Event launched successfully!');
      }

      setName(''); setDate(''); setCity(''); setLocation(''); setDescription(''); setMapUrl(''); setFloorPlanUrl(''); setTimezone('');
      setIsEventModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingEventId ? OperationType.UPDATE : OperationType.CREATE, 'events');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraftEvent = async () => {
    if (!name) {
      setEventErrors({ name: 'Event name is required even for drafts' });
      return;
    }
    
    setEventErrors({});
    setSaving(true);
    try {
      const eventData = {
        name,
        date: date || new Date().toISOString().split('T')[0],
        city: city || 'TBD',
        location: location || 'TBD',
        description: description || '',
        time: '9am - 4pm',
        timezone,
        mapUrl,
        floorPlanUrl,
        status: 'draft' as const,
        createdAt: new Date().toISOString()
      };

      if (editingEventId) {
        await updateDoc(doc(db, 'events', editingEventId), eventData);
        setEditingEventId(null);
      } else {
        await addDoc(collection(db, 'events'), eventData);
      }
      
      alert('Draft saved successfully!');
      setName(''); setDate(''); setCity(''); setLocation(''); setDescription(''); setMapUrl(''); setFloorPlanUrl(''); setTimezone('');
      setIsEventModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingEventId ? OperationType.UPDATE : OperationType.CREATE, 'events');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSeminar = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const errors: Record<string, string> = {};
    if (!selectedEventId) errors.selectedEventId = 'Please select an event';
    if (!sTitle) errors.sTitle = 'Seminar title is required';
    if (!sSpeaker) errors.sSpeaker = 'Speaker is required';
    if (!sTime) errors.sTime = 'Start time is required';
    if (!sRoom) errors.sRoom = 'Room/Location is required';
    if (!sCategory) errors.sCategory = 'Please select a category';

    if (Object.keys(errors).length > 0) {
      setSeminarErrors(errors);
      return;
    }

    setSeminarErrors({});
    setSaving(true);
    try {
      const seminarData = {
        title: sTitle,
        speaker: sSpeaker,
        time: sTime,
        room: sRoom,
        category: sCategory,
        description: sDescription,
        status: 'published' as const,
        createdAt: new Date().toISOString()
      };

      if (editingSeminarId) {
        await updateDoc(doc(db, 'events', selectedEventId, 'seminars', editingSeminarId), seminarData);
        alert('Seminar published successfully!');
        setEditingSeminarId(null);
      } else {
        await addDoc(collection(db, 'events', selectedEventId, 'seminars'), seminarData);
        alert('Seminar published successfully!');
      }

      setSTitle(''); setSSpeaker(''); setSTime(''); setSRoom(''); setSCategory(''); setSDescription('');
    } catch (error) {
      handleFirestoreError(error, editingSeminarId ? OperationType.UPDATE : OperationType.CREATE, 'seminars');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraftSeminar = async () => {
    if (!selectedEventId || !sTitle) {
      setSeminarErrors({ 
        selectedEventId: !selectedEventId ? 'Please select an event' : '',
        sTitle: !sTitle ? 'Seminar title is required' : '' 
      });
      return;
    }

    setSeminarErrors({});
    setSaving(true);
    try {
      const seminarData = {
        title: sTitle,
        speaker: sSpeaker || 'TBD',
        time: sTime || 'TBD',
        room: sRoom || 'TBD',
        category: sCategory || 'General',
        description: sDescription || '',
        status: 'draft' as const,
        createdAt: new Date().toISOString()
      };

      if (editingSeminarId) {
        await updateDoc(doc(db, 'events', selectedEventId, 'seminars', editingSeminarId), seminarData);
        setEditingSeminarId(null);
      } else {
        await addDoc(collection(db, 'events', selectedEventId, 'seminars'), seminarData);
      }

      alert('Seminar draft saved!');
      setSTitle(''); setSSpeaker(''); setSTime(''); setSRoom(''); setSCategory(''); setSDescription('');
    } catch (error) {
      handleFirestoreError(error, editingSeminarId ? OperationType.UPDATE : OperationType.CREATE, 'seminars');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSeminarInit = (seminar: Seminar) => {
    setEditingSeminarId(seminar.id);
    setSTitle(seminar.title);
    setSSpeaker(seminar.speaker);
    setSTime(seminar.time);
    setSRoom(seminar.room);
    setSCategory(seminar.category || '');
    setSDescription(seminar.description || '');
    // Focus the form
    document.getElementById('seminar-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelSeminarEdit = () => {
    setEditingSeminarId(null);
    setSTitle(''); setSSpeaker(''); setSTime(''); setSRoom(''); setSCategory(''); setSDescription('');
  };

  const handleDeleteSeminar = async (seminarId: string) => {
    if (!selectedEventId) return;
    try {
      await deleteDoc(doc(db, 'events', selectedEventId, 'seminars', seminarId));
      setDeletingSeminarId(null);
      setSelectedSeminarIds(prev => prev.filter(id => id !== seminarId));
      alert('Seminar deleted successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'seminars');
    }
  };

  const handleSaveSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;

    const errors: Record<string, string> = {};
    if (!sponName) errors.sponName = 'Sponsor name is required';
    if (!sponLogo) errors.sponLogo = 'Logo URL is required';
    
    if (Object.keys(errors).length > 0) {
      setSponsorErrors(errors);
      return;
    }

    setSponsorErrors({});
    setSaving(true);
    try {
      const sponsorData: Partial<Sponsor> = {
        eventId: selectedEventId,
        name: sponName,
        logoUrl: sponLogo,
        tier: sponTier,
        websiteUrl: sponUrl,
        description: sponDesc,
        createdAt: new Date().toISOString()
      };
      if (sponBoothId !== '') {
        sponsorData.boothId = Number(sponBoothId);
      } else if (editingSponsorId) {
        (sponsorData as any).boothId = deleteField();
      }

      if (editingSponsorId) {
        await updateDoc(doc(db, 'events', selectedEventId, 'sponsors', editingSponsorId), sponsorData);
        setEditingSponsorId(null);
      } else {
        await addDoc(collection(db, 'events', selectedEventId, 'sponsors'), sponsorData);
      }

      setSponName(''); setSponLogo(''); setSponTier('silver'); setSponUrl(''); setSponDesc(''); setSponBoothId('');
      alert('Sponsor highlights updated!');
    } catch (error) {
      handleFirestoreError(error, editingSponsorId ? OperationType.UPDATE : OperationType.CREATE, 'sponsors');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSponsorInit = (sponsor: Sponsor) => {
    setEditingSponsorId(sponsor.id);
    setSponName(sponsor.name);
    setSponLogo(sponsor.logoUrl);
    setSponTier(sponsor.tier);
    setSponUrl(sponsor.websiteUrl || '');
    setSponDesc(sponsor.description || '');
    setSponBoothId(sponsor.boothId !== undefined ? sponsor.boothId : '');
    document.getElementById('sponsor-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteSponsor = async (sponsorId: string) => {
    if (!selectedEventId) return;
    try {
      await deleteDoc(doc(db, 'events', selectedEventId, 'sponsors', sponsorId));
      setDeletingSponsorId(null);
      alert('Sponsor removed.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'sponsors');
    }
  };

  const handleSaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;

    const errors: Record<string, string> = {};
    if (!updateMsg) errors.updateMsg = 'Message is required';
    
    if (Object.keys(errors).length > 0) {
      setUpdateErrors(errors);
      return;
    }

    setUpdateErrors({});
    setSaving(true);
    try {
      const updateData: Partial<EventUpdate> = {
        eventId: selectedEventId,
        message: updateMsg,
        type: updateType,
        targetAudience: targetAudience,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'events', selectedEventId, 'updates'), updateData);
      setUpdateMsg(''); setUpdateType('info'); setTargetAudience('all');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'updates');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUpdate = async (updateId: string) => {
    if (!selectedEventId) return;
    try {
      await deleteDoc(doc(db, 'events', selectedEventId, 'updates', updateId));
      setDeletingUpdateId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'updates');
    }
  };

  const handleBulkPublishSeminars = async () => {
    if (!selectedEventId || selectedSeminarIds.length === 0) return;
    setSaving(true);
    try {
      const batch = selectedSeminarIds.map(id => 
        updateDoc(doc(db, 'events', selectedEventId, 'seminars', id), { status: 'published' })
      );
      await Promise.all(batch);
      alert(`Successfully published ${selectedSeminarIds.length} seminars!`);
      setSelectedSeminarIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'seminars');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDeleteSeminars = async () => {
    if (!selectedEventId || selectedSeminarIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedSeminarIds.length} seminars?`)) return;
    
    setSaving(true);
    try {
      const batch = selectedSeminarIds.map(id => 
        deleteDoc(doc(db, 'events', selectedEventId, 'seminars', id))
      );
      await Promise.all(batch);
      alert(`Successfully deleted ${selectedSeminarIds.length} seminars!`);
      setSelectedSeminarIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'seminars');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDeleteSponsors = async () => {
    if (!selectedEventId || selectedSponsorIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedSponsorIds.length} sponsors?`)) return;
    
    setSaving(true);
    try {
      const batch = selectedSponsorIds.map(id => 
        deleteDoc(doc(db, 'events', selectedEventId, 'sponsors', id))
      );
      await Promise.all(batch);
      alert(`Successfully deleted ${selectedSponsorIds.length} sponsors!`);
      setSelectedSponsorIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'sponsors');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRegStatus = async (path: string, newStatus: string) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, path), { status: newStatus });
      setEditingReg(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReg = async (path: string) => {
    setSaving(true);
    try {
      await deleteDoc(doc(db, path));
      setDeletingReg(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto w-full space-y-8 pb-12"
    >
      {/* Existing Events List */}
      <div className="bg-white rounded-lg border border-[#E4E6EB] shadow-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#1C1E21] tracking-tight">Manage Existing Events</h2>
          <button 
            onClick={() => {
              handleCancelEdit(); // Clear fields
              setIsEventModalOpen(true);
            }}
            className="px-4 py-2 bg-[#1976D2] text-white font-bold rounded hover:bg-[#1565C0] transition-colors"
          >
            + Create New Event
          </button>
        </div>
        
        {/* Event Creator Modal */}
        <AnimatePresence>
          {isEventModalOpen && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="flex items-center justify-between p-6 border-b border-[#E4E6EB] bg-[#F8F9FA]">
                  <h2 className="text-2xl font-bold text-[#1C1E21] tracking-tight">{editingEventId ? 'Edit Expo Event' : 'Create New Expo Event'}</h2>
                  <button 
                    onClick={() => setIsEventModalOpen(false)}
                    className="p-2 hover:bg-[#E4E6EB] rounded-full text-[#606770] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="overflow-y-auto p-8">
                  <form onSubmit={handleCreateEvent} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5 flex justify-between">
                          Event Name
                          {eventErrors.name && <span className="text-[#D32F2F] normal-case font-medium">{eventErrors.name}</span>}
                        </label>
                        <input 
                          type="text" 
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            if (eventErrors.name) setEventErrors(prev => ({ ...prev, name: '' }));
                          }}
                          className={cn(
                            "w-full bg-[#F0F2F5] border rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2] transition-colors",
                            eventErrors.name ? "border-[#D32F2F]" : "border-[#E4E6EB]"
                          )}
                          placeholder="e.g. California Black College Expo"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5 flex justify-between">
                          Date
                          {eventErrors.date && <span className="text-[#D32F2F] normal-case font-medium">{eventErrors.date}</span>}
                        </label>
                        <input 
                          type="date" 
                          value={date}
                          onChange={(e) => {
                            setDate(e.target.value);
                            if (eventErrors.date) setEventErrors(prev => ({ ...prev, date: '' }));
                          }}
                          className={cn(
                            "w-full bg-[#F0F2F5] border rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2] transition-colors",
                            eventErrors.date ? "border-[#D32F2F]" : "border-[#E4E6EB]"
                          )}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5 flex justify-between">
                          City
                          {eventErrors.city && <span className="text-[#D32F2F] normal-case font-medium">{eventErrors.city}</span>}
                        </label>
                        <input 
                          type="text" 
                          value={city}
                          onChange={(e) => {
                            setCity(e.target.value);
                            if (eventErrors.city) setEventErrors(prev => ({ ...prev, city: '' }));
                          }}
                          className={cn(
                            "w-full bg-[#F0F2F5] border rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2] transition-colors",
                            eventErrors.city ? "border-[#D32F2F]" : "border-[#E4E6EB]"
                          )}
                          placeholder="e.g. Los Angeles"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5 flex justify-between">
                          Location
                          {eventErrors.location && <span className="text-[#D32F2F] normal-case font-medium">{eventErrors.location}</span>}
                        </label>
                        <input 
                          type="text" 
                          value={location}
                          onChange={(e) => {
                            setLocation(e.target.value);
                            if (eventErrors.location) setEventErrors(prev => ({ ...prev, location: '' }));
                          }}
                          className={cn(
                            "w-full bg-[#F0F2F5] border rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2] transition-colors",
                            eventErrors.location ? "border-[#D32F2F]" : "border-[#E4E6EB]"
                          )}
                          placeholder="e.g. LA Convention Center"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5 flex justify-between">
                          Timezone
                        </label>
                        <select 
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2]"
                        >
                          <option value="">Select Timezone</option>
                          <option value="America/New_York">Eastern Time (ET)</option>
                          <option value="America/Chicago">Central Time (CT)</option>
                          <option value="America/Denver">Mountain Time (MT)</option>
                          <option value="America/Los_Angeles">Pacific Time (PT)</option>
                          <option value="America/Anchorage">Alaska Time (AKT)</option>
                          <option value="Pacific/Honolulu">Hawaii-Aleutian Time (HAT)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5 flex justify-between">
                          Map URL
                        </label>
                        <input 
                          type="text" 
                          value={mapUrl}
                          onChange={(e) => setMapUrl(e.target.value)}
                          className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2]"
                          placeholder="https://..."
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5 flex justify-between">
                          Floor Plan URL
                        </label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={floorPlanUrl}
                            onChange={(e) => setFloorPlanUrl(e.target.value)}
                            className="flex-grow bg-[#F0F2F5] border border-[#E4E6EB] rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2]"
                            placeholder="Link to JPG/PNG floor plan"
                          />
                          <button 
                            type="button" 
                            onClick={() => {
                              const url = prompt('Enter image URL for Floor Plan:');
                              if (url) setFloorPlanUrl(url);
                            }}
                            className="bg-white border border-[#E4E6EB] px-3 rounded hover:bg-[#F0F2F5] transition-colors"
                          >
                            <MapPin className="w-4 h-4 text-[#606770]" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5 flex justify-between">
                        Description
                        {eventErrors.description && <span className="text-[#D32F2F] normal-case font-medium">{eventErrors.description}</span>}
                      </label>
                      <textarea 
                        value={description}
                        onChange={(e) => {
                          setDescription(e.target.value);
                          if (eventErrors.description) setEventErrors(prev => ({ ...prev, description: '' }));
                        }}
                        rows={4}
                        className={cn(
                          "w-full bg-[#F0F2F5] border rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2] resize-none transition-colors",
                          eventErrors.description ? "border-[#D32F2F]" : "border-[#E4E6EB]"
                        )}
                        placeholder="Tell attendees what to expect..."
                      />
                    </div>
                    <div className="pt-4 flex flex-wrap gap-3">
                      <button 
                        type="submit"
                        disabled={saving}
                        className="flex-grow md:flex-none px-8 py-3 bg-[#D32F2F] text-white font-bold rounded hover:bg-black transition-colors disabled:opacity-50"
                      >
                        <div className="flex items-center justify-center gap-2">
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          {saving ? 'Processing...' : editingEventId ? 'Update & Launch' : 'Launch Expo Event'}
                        </div>
                      </button>
                      <button 
                        type="button"
                        onClick={handleSaveDraftEvent}
                        disabled={saving}
                        className="flex-grow md:flex-none px-6 py-3 bg-[#F0F2F5] text-[#1C1E21] font-bold rounded hover:bg-[#E4E6EB] transition-colors disabled:opacity-50 border border-[#E4E6EB] flex items-center justify-center gap-2"
                      >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {editingEventId ? 'Save as Draft' : 'Save Draft'}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="text-center py-6 text-[#606770] italic text-[13px]">No events found to manage.</div>
          ) : (
            events.map(event => (
              <div key={event.id} className="border border-[#F0F2F5] rounded-xl overflow-hidden bg-white hover:border-[#E4E6EB] transition-all">
                <div className={cn(
                  "flex items-center justify-between p-4 transition-colors",
                  selectedEventId === event.id ? "bg-[#F8F9FA]" : "hover:bg-[#F8F9FA]"
                )}>
                      <div className="flex-grow cursor-pointer" onClick={() => {
                        const newId = selectedEventId === event.id ? '' : event.id;
                        setSelectedEventId(newId);
                        setSelectedSeminarIds([]);
                      }}>
                    <div className="font-bold text-[#1C1E21] text-[15px] flex items-center gap-2">
                      {event.name}
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded font-black uppercase",
                        event.status === 'draft' ? "bg-[#FFF5F5] text-[#D32F2F] border border-[#FFEBEE]" : "bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]"
                      )}>
                        {event.status === 'draft' ? 'Draft' : 'Published'}
                      </span>
                      {selectedEventId === event.id ? <ChevronRight className="w-3 h-3 rotate-90 transition-transform" /> : <ChevronRight className="w-3 h-3 transition-transform" />}
                    </div>
                    <div className="text-[12px] text-[#606770]">{event.city} • {format(new Date(event.date), 'MMM dd, yyyy')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleToggleEventStatus(event)}
                      className={cn(
                        "p-2 rounded-lg transition-colors flex items-center gap-1.5",
                        event.status === 'published' ? "text-[#1976D2] hover:bg-[#E3F2FD]" : "text-[#606770] hover:bg-[#F0F2F5]"
                      )}
                      title={event.status === 'published' ? "Unpublish Event" : "Publish Event"}
                    >
                      {event.status === 'published' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => setSelectedEventId(selectedEventId === event.id ? '' : event.id)}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        selectedEventId === event.id ? "text-[#1976D2] bg-[#E3F2FD]" : "text-[#606770] hover:bg-[#F0F2F5]"
                      )}
                      title="Manage Seminars"
                    >
                      <Clock className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleEditInit(event)}
                      className="p-2 text-[#606770] hover:text-[#1976D2] transition-colors"
                      title="Edit Event"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setDeletingEventId(event.id)}
                      className="p-2 text-[#606770] hover:text-[#D32F2F] transition-colors"
                      title="Delete Event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Inline Seminar Management */}
                <AnimatePresence>
                  {selectedEventId === event.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-[#F0F2F5] bg-[#F8F9FA]/50"
                    >
                      <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-3">
                            <h4 className="text-[11px] font-bold uppercase text-[#606770] tracking-wider">Event Schedule / Seminars</h4>
                            {seminarsForSelectedEvent.length > 0 && (
                              <label className="flex items-center gap-2 cursor-pointer group">
                                <input 
                                  type="checkbox" 
                                  className="w-3 h-3 rounded border-[#E4E6EB] text-[#1976D2] focus:ring-[#1976D2]"
                                  checked={selectedSeminarIds.length === seminarsForSelectedEvent.length && seminarsForSelectedEvent.length > 0}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedSeminarIds(seminarsForSelectedEvent.map(s => s.id));
                                    } else {
                                      setSelectedSeminarIds([]);
                                    }
                                  }}
                                />
                                <span className="text-[10px] font-bold text-[#606770] group-hover:text-[#1C1E21] transition-colors">Select All</span>
                              </label>
                            )}
                          </div>
                          <button 
                            onClick={() => document.getElementById('seminar-form')?.scrollIntoView({ behavior: 'smooth' })}
                            className="text-[11px] font-bold text-[#1976D2] hover:underline"
                          >
                            + Add New Seminar
                          </button>
                        </div>

                        {selectedSeminarIds.length > 0 && (
                          <div className="bg-[#E3F2FD] border border-[#BBDEFB] rounded-lg p-3 flex items-center justify-between">
                            <span className="text-[12px] font-bold text-[#1976D2]">
                              {selectedSeminarIds.length} seminar{selectedSeminarIds.length !== 1 ? 's' : ''} selected
                            </span>
                            <div className="flex gap-2">
                              <button 
                                onClick={handleBulkPublishSeminars}
                                disabled={saving}
                                className="px-3 py-1 bg-white text-[#1976D2] text-[11px] font-bold rounded-md border border-[#BBDEFB] hover:bg-[#1976D2] hover:text-white transition-all flex items-center gap-1.5"
                              >
                                <Send className="w-3 h-3" />
                                Publish Selected
                              </button>
                              <button 
                                onClick={handleBulkDeleteSeminars}
                                disabled={saving}
                                className="px-3 py-1 bg-white text-[#D32F2F] text-[11px] font-bold rounded-md border border-[#FFEBEE] hover:bg-[#D32F2F] hover:text-white transition-all flex items-center gap-1.5"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete Selected
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          {loadingSeminars ? (
                            <div className="py-12 flex flex-col items-center justify-center text-[#606770] bg-[#F8F9FA] rounded-xl border border-dashed border-[#E4E6EB]">
                              <Loader2 className="w-8 h-8 animate-spin mb-2 opacity-20" />
                              <p className="text-[12px] font-bold uppercase tracking-widest">Fetching schedule...</p>
                            </div>
                          ) : seminarsForSelectedEvent.length === 0 ? (
                            <div className="py-6 text-center text-[12px] text-[#606770] italic">No seminars scheduled for this expo.</div>
                          ) : (
                            seminarsForSelectedEvent.map(sem => (
                              <div key={sem.id} className="flex items-center gap-3 p-3 bg-white border border-[#E4E6EB] rounded-lg shadow-sm hover:border-[#BBDEFB] transition-colors group">
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 rounded border-[#E4E6EB] text-[#1976D2] focus:ring-[#1976D2] cursor-pointer"
                                  checked={selectedSeminarIds.includes(sem.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedSeminarIds(prev => [...prev, sem.id]);
                                    } else {
                                      setSelectedSeminarIds(prev => prev.filter(id => id !== sem.id));
                                    }
                                  }}
                                />
                                <div className="flex-grow">
                                  <div className="text-[13px] font-bold text-[#1C1E21] flex items-center gap-2">
                                    {sem.title}
                                    {sem.status === 'draft' && <span className="text-[8px] border border-[#606770] text-[#606770] px-1 rounded uppercase font-black">Draft</span>}
                                  </div>
                                  <div className="text-[11px] text-[#606770] flex items-center gap-2 mt-0.5">
                                    <span className="font-semibold text-[#D32F2F]">{sem.time}</span>
                                    <span>•</span>
                                    <span className="bg-[#F0F2F5] px-1.5 py-0.5 rounded text-[9px] font-bold text-[#1976D2] uppercase">{sem.category}</span>
                                    <span>•</span>
                                    <span>{sem.speaker}</span>
                                    <span>•</span>
                                    <span>{sem.room}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button 
                                    onClick={() => handleEditSeminarInit(sem)}
                                    className="p-1.5 text-[#606770] hover:text-[#1976D2] transition-colors"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => setDeletingSeminarId(sem.id)}
                                    className="p-1.5 text-[#606770] hover:text-[#D32F2F] transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingEventId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 bg-[#FFF5F5] text-[#D32F2F] rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#1C1E21] mb-2">Delete Event?</h3>
              <p className="text-[14px] text-[#606770] mb-8">
                Are you sure you want to delete <span className="font-bold text-[#1C1E21]">"{events.find(e => e.id === deletingEventId)?.name}"</span>? 
                This action cannot be undone and will also delete all associated seminars.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingEventId(null)}
                  className="flex-grow py-3 bg-[#F0F2F5] text-[#1C1E21] font-bold rounded-xl hover:bg-[#E4E6EB]"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDeleteEvent(deletingEventId)}
                  className="flex-grow py-3 bg-[#D32F2F] text-white font-bold rounded-xl hover:bg-black"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Registrant List */}
      <div className="bg-white rounded-lg border border-[#E4E6EB] shadow-sm p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#1C1E21] tracking-tight">Event Registrants</h2>
            {registrants.length > 0 && (
              <p className="text-[11px] font-bold text-[#606770] uppercase mt-1">
                Showing {registrants.length} total registration{registrants.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={handleExportCSV}
              disabled={registrants.length === 0}
              className="px-4 py-2 bg-[#1976D2] text-white text-[13px] font-bold rounded-xl hover:bg-black transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <select 
              value={targetEventForReport}
              onChange={(e) => setTargetEventForReport(e.target.value)}
              className="bg-[#F0F2F5] border border-[#E4E6EB] rounded-xl px-4 py-2 text-[13px] font-semibold outline-none focus:border-[#1976D2] min-w-[220px] transition-all"
            >
              <option value="">Select event to view list...</option>
              <option value="all">Show All Events</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name} ({ev.city})</option>
              ))}
            </select>

            <div className="flex bg-[#F0F2F5] p-1 rounded-xl border border-[#E4E6EB]">
              {[
                { id: 'all', label: 'All' },
                { id: 'confirmed', label: 'Confirmed' },
                { id: 'pending', label: 'Pending' },
                { id: 'cancelled', label: 'Cancelled' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all",
                    statusFilter === tab.id 
                      ? "bg-white text-[#1976D2] shadow-sm" 
                      : "text-[#606770] hover:text-[#1C1E21]"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-hidden border border-[#F0F2F5] rounded-xl">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#F8F9FA] text-[#606770] font-bold uppercase text-[10px] border-b border-[#F0F2F5]">
              <tr>
                <th className="px-4 py-3">Registrant Name</th>
                <th className="px-4 py-3">Event Name</th>
                <th className="px-4 py-3">Registration Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F2F5]">
              {loadingReport ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16">
                    <div className="flex flex-col items-center justify-center text-[#606770]">
                      <Loader2 className="w-10 h-10 animate-spin mb-4 opacity-10" />
                      <p className="text-[14px] font-bold uppercase tracking-widest opacity-50">Compiling Registrant List...</p>
                    </div>
                  </td>
                </tr>
              ) : registrants.length > 0 ? (
                registrants.map((reg, idx) => (
                  <tr key={idx} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#1C1E21]">{reg.userName || 'Anonymous User'}</div>
                      <div className="text-[11px] text-[#606770]">{reg.userEmail || 'No email provided'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#1C1E21]">{reg.eventName || 'Unknown Event'}</div>
                    </td>
                    <td className="px-4 py-3 text-[#606770]">
                      {reg.registeredAt ? format(new Date(reg.registeredAt), 'MMM dd, yyyy p') : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-block px-2 py-0.5 rounded font-bold text-[10px] uppercase",
                        reg.status === 'confirmed' ? "bg-[#E8F5E9] text-[#2E7D32]" : 
                        reg.status === 'pending' ? "bg-[#FFF3E0] text-[#E65100]" :
                        "bg-[#FFF5F5] text-[#D32F2F]"
                      )}>
                        {reg.status || 'confirmed'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => setEditingReg(reg)}
                          className="p-1.5 text-[#606770] hover:text-[#1976D2] transition-colors"
                          title="Change Status"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setDeletingReg(reg)}
                          className="p-1.5 text-[#606770] hover:text-[#D32F2F] transition-colors"
                          title="Cancel Registration"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-[#606770] italic">
                    {targetEventForReport ? "No users have registered for this event yet." : "Please select an event to view the registration list."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reg Status Modal */}
      <AnimatePresence>
        {editingReg && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full"
            >
              <h3 className="text-xl font-bold text-[#1C1E21] mb-2">Update Status</h3>
              <p className="text-[13px] text-[#606770] mb-6">Change registration status for <span className="font-bold text-[#1C1E21]">{editingReg.userName}</span>.</p>
              
              <div className="space-y-3 mb-8">
                {['confirmed', 'pending', 'cancelled'].map(status => (
                  <button
                    key={status}
                    onClick={() => handleUpdateRegStatus(editingReg.path, status)}
                    disabled={saving}
                    className={cn(
                      "w-full py-3 px-4 rounded-xl border flex items-center justify-between font-bold text-[14px] transition-all",
                      editingReg.status === status 
                        ? (status === 'confirmed' ? "bg-[#2E7D32] text-white border-[#2E7D32]" : 
                           status === 'pending' ? "bg-[#E65100] text-white border-[#E65100]" :
                           "bg-[#D32F2F] text-white border-[#D32F2F]")
                        : "bg-white text-[#1C1E21] border-[#E4E6EB] hover:border-[#1976D2]"
                    )}
                  >
                    <span className="capitalize">{status}</span>
                    {editingReg.status === status && <div className="w-2 h-2 bg-white rounded-full" />}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setEditingReg(null)}
                className="w-full py-3 bg-[#F0F2F5] text-[#1C1E21] font-bold rounded-xl hover:bg-[#E4E6EB]"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reg Delete Confirm Modal */}
      <AnimatePresence>
        {deletingReg && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 bg-[#FFF5F5] text-[#D32F2F] rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#1C1E21] mb-2">Cancel Registration?</h3>
              <p className="text-[14px] text-[#606770] mb-8">
                Are you sure you want to remove <span className="font-bold text-[#1C1E21]">{deletingReg.userName}</span> from <span className="font-bold text-[#1C1E21]">{deletingReg.eventName}</span>? 
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingReg(null)}
                  className="flex-grow py-3 bg-[#F0F2F5] text-[#1C1E21] font-bold rounded-xl hover:bg-[#E4E6EB]"
                >
                  Keep
                </button>
                <button 
                  onClick={() => handleDeleteReg(deletingReg.path)}
                  disabled={saving}
                  className="flex-grow py-3 bg-[#D32F2F] text-white font-bold rounded-xl hover:bg-black disabled:opacity-50"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Seminar Creator */}
      <div id="seminar-form" className="bg-white rounded-lg border border-[#E4E6EB] shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-5 h-5 text-[#1976D2]" />
          <h2 className="text-2xl font-bold text-[#1C1E21] tracking-tight">Add Seminar / Workshop</h2>
        </div>
        
        <form onSubmit={handleCreateSeminar} className="space-y-5">
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5 flex justify-between">
              Select Event
              {seminarErrors.selectedEventId && <span className="text-[#D32F2F] normal-case font-medium">{seminarErrors.selectedEventId}</span>}
            </label>
            <select 
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                if (seminarErrors.selectedEventId) setSeminarErrors(prev => ({ ...prev, selectedEventId: '' }));
              }}
              className={cn(
                "w-full bg-[#F0F2F5] border rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2] transition-colors",
                seminarErrors.selectedEventId ? "border-[#D32F2F]" : "border-[#E4E6EB]"
              )}
            >
              <option value="">Choose an existing event...</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name} ({ev.city})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5 flex justify-between">
                Seminar Title
                {seminarErrors.sTitle && <span className="text-[#D32F2F] normal-case font-medium">{seminarErrors.sTitle}</span>}
              </label>
              <input 
                type="text" 
                value={sTitle}
                onChange={(e) => {
                  setSTitle(e.target.value);
                  if (seminarErrors.sTitle) setSeminarErrors(prev => ({ ...prev, sTitle: '' }));
                }}
                className={cn(
                  "w-full bg-[#F0F2F5] border rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2] transition-colors",
                  seminarErrors.sTitle ? "border-[#D32F2F]" : "border-[#E4E6EB]"
                )}
                placeholder="e.g. Scholarships 101"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5 flex justify-between">
                Speaker / Panelists
                {seminarErrors.sSpeaker && <span className="text-[#D32F2F] normal-case font-medium">{seminarErrors.sSpeaker}</span>}
              </label>
              <input 
                type="text" 
                value={sSpeaker}
                onChange={(e) => {
                  setSSpeaker(e.target.value);
                  if (seminarErrors.sSpeaker) setSeminarErrors(prev => ({ ...prev, sSpeaker: '' }));
                }}
                className={cn(
                  "w-full bg-[#F0F2F5] border rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2] transition-colors",
                  seminarErrors.sSpeaker ? "border-[#D32F2F]" : "border-[#E4E6EB]"
                )}
                placeholder="e.g. Dr. Theresa Price"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5 flex justify-between">
                Start Time
                {seminarErrors.sTime && <span className="text-[#D32F2F] normal-case font-medium">{seminarErrors.sTime}</span>}
              </label>
              <input 
                type="text" 
                value={sTime}
                onChange={(e) => {
                  setSTime(e.target.value);
                  if (seminarErrors.sTime) setSeminarErrors(prev => ({ ...prev, sTime: '' }));
                }}
                className={cn(
                  "w-full bg-[#F0F2F5] border rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2] transition-colors",
                  seminarErrors.sTime ? "border-[#D32F2F]" : "border-[#E4E6EB]"
                )}
                placeholder="e.g. 10:30 AM"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5 flex justify-between">
                Room / Location
                {seminarErrors.sRoom && <span className="text-[#D32F2F] normal-case font-medium">{seminarErrors.sRoom}</span>}
              </label>
              <input 
                type="text" 
                value={sRoom}
                onChange={(e) => {
                  setSRoom(e.target.value);
                  if (seminarErrors.sRoom) setSeminarErrors(prev => ({ ...prev, sRoom: '' }));
                }}
                className={cn(
                  "w-full bg-[#F0F2F5] border rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2] transition-colors",
                  seminarErrors.sRoom ? "border-[#D32F2F]" : "border-[#E4E6EB]"
                )}
                placeholder="e.g. Main Hall Stage"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5 flex justify-between">
                Category
                {seminarErrors.sCategory && <span className="text-[#D32F2F] normal-case font-medium">{seminarErrors.sCategory}</span>}
              </label>
              <select 
                value={sCategory}
                onChange={(e) => {
                  setSCategory(e.target.value);
                  if (seminarErrors.sCategory) setSeminarErrors(prev => ({ ...prev, sCategory: '' }));
                }}
                className={cn(
                  "w-full bg-[#F0F2F5] border rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2] transition-colors",
                  seminarErrors.sCategory ? "border-[#D32F2F]" : "border-[#E4E6EB]"
                )}
              >
                <option value="">Select Category...</option>
                <option value="Scholarships">Scholarships</option>
                <option value="Admissions">Admissions</option>
                <option value="Career Advice">Career Advice</option>
                <option value="Financial Aid">Financial Aid</option>
                <option value="Student Life">Student Life</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5">Brief Description / Session Overview</label>
              <textarea 
                value={sDescription}
                onChange={(e) => setSDescription(e.target.value)}
                className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2] min-h-[80px] resize-none"
                placeholder="Details about what will be covered in this session..."
              />
            </div>
          </div>

          <div className="pt-4 flex flex-wrap gap-3">
            <button 
              type="submit"
              disabled={saving}
              className="w-full md:w-auto px-8 py-3 bg-[#1976D2] text-white font-bold rounded hover:bg-black transition-colors disabled:opacity-50"
            >
              <div className="flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {saving ? 'Processing...' : editingSeminarId ? 'Update & Publish' : 'Publish Seminar'}
              </div>
            </button>
            <button 
              type="button"
              onClick={handleSaveDraftSeminar}
              disabled={saving}
              className="w-full md:w-auto px-6 py-3 bg-[#F0F2F5] text-[#1C1E21] font-bold rounded hover:bg-[#E4E6EB] transition-colors disabled:opacity-50 border border-[#E4E6EB] flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingSeminarId ? 'Save as Draft' : 'Save Draft'}
            </button>
            {editingSeminarId && (
              <button 
                type="button"
                onClick={handleCancelSeminarEdit}
                className="px-6 py-3 bg-white text-[#606770] font-bold rounded hover:bg-[#F0F2F5] border border-[#E4E6EB]"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Seminar List for Selected Event (Summary View) */}
        {selectedEventId && seminarsForSelectedEvent.length > 0 && !editingSeminarId && (
          <div className="mt-8 pt-8 border-t border-[#F0F2F5]">
            <h4 className="text-[11px] font-bold uppercase text-[#606770] mb-4">Quick Preview: Seminars for Selected Event</h4>
            <div className="space-y-2">
              {seminarsForSelectedEvent.slice(0, 3).map(sem => (
                <div key={sem.id} className="flex items-center justify-between p-3 bg-[#F8F9FA] border border-[#E4E6EB] rounded-lg opacity-60">
                  <div className="flex-grow">
                    <div className="text-[13px] font-bold text-[#1C1E21]">{sem.title}</div>
                    <div className="text-[11px] text-[#606770]">{sem.time} • {sem.speaker}</div>
                  </div>
                </div>
              ))}
              {seminarsForSelectedEvent.length > 3 && (
                <div className="text-center text-[10px] text-[#606770] font-bold uppercase">+ {seminarsForSelectedEvent.length - 3} More Seminars (Manage them in the list above)</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Seminar Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingSeminarId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center"
            >
              <div className="w-12 h-12 bg-[#FFF5F5] text-[#D32F2F] rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#1C1E21] mb-2">Delete Seminar?</h3>
              <p className="text-[13px] text-[#606770] mb-6">Are you sure you want to delete this seminar? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingSeminarId(null)}
                  className="flex-grow py-2.5 bg-[#F0F2F5] text-[#1C1E21] font-bold rounded-lg hover:bg-[#E4E6EB]"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDeleteSeminar(deletingSeminarId)}
                  className="flex-grow py-2.5 bg-[#D32F2F] text-white font-bold rounded-lg hover:bg-black"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sponsor Highlights Creator */}
      <div id="sponsor-form" className="bg-white rounded-lg border border-[#E4E6EB] shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <Star className="w-5 h-5 text-[#E65100]" />
          <h2 className="text-2xl font-bold text-[#1C1E21] tracking-tight">Highlight Sponsors</h2>
        </div>
        
        <form onSubmit={handleSaveSponsor} className="space-y-5">
           <div>
            <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5 flex justify-between">
              Select Event
              {/* Reuse selectedEventId from seminars or have separate? Let's use the same selectedEventId for convenience */}
            </label>
            <select 
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2] transition-colors"
            >
              <option value="">Choose an event to add sponsors to...</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name} ({ev.city})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5 flex justify-between">
                Sponsor Name
                {sponsorErrors.sponName && <span className="text-[#D32F2F] normal-case font-medium">{sponsorErrors.sponName}</span>}
              </label>
              <input 
                type="text" 
                value={sponName}
                onChange={(e) => setSponName(e.target.value)}
                className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2] transition-colors"
                placeholder="e.g. Google, IBM, local bank"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5 flex justify-between">
                Logo URL (PNG/JPG)
                {sponsorErrors.sponLogo && <span className="text-[#D32F2F] normal-case font-medium">{sponsorErrors.sponLogo}</span>}
              </label>
              <input 
                type="text" 
                value={sponLogo}
                onChange={(e) => setSponLogo(e.target.value)}
                className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2] transition-colors"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5">Sponsorship Tier</label>
              <select 
                value={sponTier}
                onChange={(e) => setSponTier(e.target.value as Sponsor['tier'])}
                className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2] transition-colors"
              >
                <option value="platinum">Platinum Partner</option>
                <option value="gold">Gold Sponsor</option>
                <option value="silver">Silver Sponsor</option>
                <option value="bronze">Bronze Sponsor</option>
                <option value="exhibitor">Exhibitor</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5">Website URL (Optional)</label>
              <input 
                type="text" 
                value={sponUrl}
                onChange={(e) => setSponUrl(e.target.value)}
                className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2] transition-colors"
                placeholder="https://..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5">Tagline / Description (Optional)</label>
              <textarea 
                value={sponDesc}
                onChange={(e) => setSponDesc(e.target.value)}
                className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2] min-h-[60px] resize-none"
                placeholder="Short sentence about the sponsor..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5">Map to Booth (Optional)</label>
              <select
                value={sponBoothId}
                onChange={(e) => setSponBoothId(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2]"
              >
                <option value="">-- No Booth Assigned --</option>
                {PLACEHOLDER_BOOTHS.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.type})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              disabled={saving || !selectedEventId}
              className="w-full md:w-auto px-8 py-3 bg-[#E65100] text-white font-bold rounded hover:bg-black transition-colors disabled:opacity-50 shadow-lg shadow-[#E65100]/20 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Processing...' : editingSponsorId ? 'Update Sponsor' : 'Add Sponsor to Highlights'}
            </button>
          </div>
        </form>

        {/* Existing Sponsors List */}
        {selectedEventId && (
          <div className="mt-10 pt-8 border-t border-[#F0F2F5]">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[11px] font-bold uppercase text-[#606770]">Sponsors for Selected Event</h4>
              {sponsorsForSelectedEvent.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="w-3 h-3 rounded border-[#E4E6EB] text-[#1976D2] focus:ring-[#1976D2]"
                    checked={selectedSponsorIds.length === sponsorsForSelectedEvent.length && sponsorsForSelectedEvent.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSponsorIds(sponsorsForSelectedEvent.map(s => s.id));
                      } else {
                        setSelectedSponsorIds([]);
                      }
                    }}
                  />
                  <span className="text-[11px] font-bold text-[#606770] uppercase tracking-wider group-hover:text-[#1976D2] transition-colors">Select All</span>
                </label>
              )}
            </div>

            {selectedSponsorIds.length > 0 && (
              <div className="bg-[#FFEBEE] border border-[#FFCDD2] rounded-lg p-3 flex items-center justify-between mb-4">
                <span className="text-[12px] font-bold text-[#D32F2F]">
                  {selectedSponsorIds.length} sponsor{selectedSponsorIds.length !== 1 ? 's' : ''} selected
                </span>
                <button 
                  onClick={handleBulkDeleteSponsors}
                  disabled={saving}
                  className="px-3 py-1 bg-white text-[#D32F2F] text-[11px] font-bold rounded-md border border-[#FFEBEE] hover:bg-[#D32F2F] hover:text-white transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete Selected
                </button>
              </div>
            )}

            {loadingSponsors ? (
              <div className="py-12 flex flex-col items-center justify-center text-[#606770] bg-[#F8F9FA] rounded-xl border border-dashed border-[#E4E6EB]">
                <Loader2 className="w-8 h-8 animate-spin mb-2 opacity-20" />
                <p className="text-[12px] font-bold uppercase tracking-widest">Fetching sponsors...</p>
              </div>
            ) : sponsorsForSelectedEvent.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-[#606770] italic">No sponsors added for this expo.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sponsorsForSelectedEvent.map(spon => (
                  <div key={spon.id} className="p-4 bg-[#F8F9FA] rounded-xl border border-[#E4E6EB] flex items-center gap-4 group hover:border-[#BBDEFB]">
                     <input 
                       type="checkbox" 
                       className="w-4 h-4 rounded border-[#E4E6EB] text-[#1976D2] focus:ring-[#1976D2] cursor-pointer"
                       checked={selectedSponsorIds.includes(spon.id)}
                       onChange={(e) => {
                         if (e.target.checked) {
                           setSelectedSponsorIds(prev => [...prev, spon.id]);
                         } else {
                           setSelectedSponsorIds(prev => prev.filter(id => id !== spon.id));
                         }
                       }}
                     />
                     <div className="w-12 h-12 rounded bg-white p-1 border border-[#E4E6EB] shrink-0">
                       <img src={spon.logoUrl} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                     </div>
                     <div className="flex-grow min-w-0">
                       <div className="text-[13px] font-bold text-[#1C1E21] truncate">{spon.name}</div>
                       <div className="text-[10px] text-[#E65100] font-bold uppercase tracking-wider">{spon.tier}</div>
                       {spon.websiteUrl && (
                         <div className="text-[10px] text-[#1976D2] truncate opacity-80 mt-0.5">{spon.websiteUrl}</div>
                       )}
                     </div>
                     <div className="flex gap-1 shrink-0">
                       <button onClick={() => handleEditSponsorInit(spon)} className="p-1.5 text-[#606770] hover:text-[#1976D2]"><Edit2 className="w-3.5 h-3.5" /></button>
                       <button onClick={() => setDeletingSponsorId(spon.id)} className="p-1.5 text-[#606770] hover:text-[#D32F2F]"><Trash2 className="w-3.5 h-3.5" /></button>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {deletingSponsorId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 text-center">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-8 max-w-sm w-full">
              <Trash2 className="w-12 h-12 text-[#D32F2F] mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Remove Sponsor?</h3>
              <p className="text-[14px] text-[#606770] mb-6">Are you sure? This will remove them from the event dashboard.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingSponsorId(null)} className="flex-grow py-3 bg-[#F0F2F5] rounded-xl font-bold">Keep</button>
                <button onClick={() => handleDeleteSponsor(deletingSponsorId)} className="flex-grow py-3 bg-[#D32F2F] text-white rounded-xl font-bold">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Broadcast Updates Creator */}
      <div className="bg-white rounded-lg border border-[#E4E6EB] shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-[#1976D2]" />
          <h2 className="text-2xl font-bold text-[#1C1E21] tracking-tight">Broadcast Updates</h2>
        </div>
        
        <form onSubmit={handleSaveUpdate} className="space-y-5">
           <div>
            <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5 flex justify-between">
              Select Event
            </label>
            <select 
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2] transition-colors"
            >
              <option value="">Choose an event...</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name} ({ev.city})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5 flex justify-between">
                Announcement / Update Message
                {updateErrors.updateMsg && <span className="text-[#D32F2F] normal-case font-medium">{updateErrors.updateMsg}</span>}
              </label>
              <input 
                type="text" 
                value={updateMsg}
                onChange={(e) => setUpdateMsg(e.target.value)}
                className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2] transition-colors"
                placeholder="e.g. Room change: College Prep Seminar is now in Hall A."
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5">Update Type</label>
              <select 
                value={updateType}
                onChange={(e) => setUpdateType(e.target.value as EventUpdate['type'])}
                className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2] transition-colors"
              >
                <option value="info">Info (Blue)</option>
                <option value="warning">Warning (Orange)</option>
                <option value="alert">Alert (Red)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5">Target Audience</label>
              <select 
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as EventUpdate['targetAudience'])}
                className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded px-4 py-2 text-[14px] outline-none focus:border-[#1976D2] transition-colors"
              >
                <option value="all">All Users</option>
                <option value="student">Students Only</option>
                <option value="parent">Parents Only</option>
                <option value="recruiter">Recruiters Only</option>
                <option value="admin">Admins Only</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="submit"
              disabled={saving || !selectedEventId}
              className="px-8 py-3 bg-[#1976D2] text-white font-bold rounded hover:bg-black transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Processing...' : 'Push Live Update'}
            </button>
          </div>
        </form>

        {/* Existing Updates List */}
        {selectedEventId && (
          <div className="mt-10 pt-8 border-t border-[#F0F2F5]">
            <h4 className="text-[11px] font-bold uppercase text-[#606770] mb-4">Recent Updates for Selected Event</h4>
            {loadingUpdates ? (
              <div className="py-12 flex flex-col items-center justify-center text-[#606770] bg-[#F8F9FA] rounded-xl border border-dashed border-[#E4E6EB]">
                <Loader2 className="w-8 h-8 animate-spin mb-2 opacity-20" />
                <p className="text-[12px] font-bold uppercase tracking-widest">Fetching updates...</p>
              </div>
            ) : updatesForSelectedEvent.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-[#606770] italic">No updates broadcasted for this expo.</div>
            ) : (
              <div className="space-y-3">
                {updatesForSelectedEvent.map(update => (
                  <div key={update.id} className="p-4 bg-[#F8F9FA] rounded-xl border border-[#E4E6EB] flex items-start gap-4">
                     <div className="shrink-0 mt-0.5">
                       {update.type === 'alert' && <AlertCircle className="w-4 h-4 text-[#D32F2F]" />}
                       {update.type === 'warning' && <AlertTriangle className="w-4 h-4 text-[#F57F17]" />}
                       {update.type === 'info' && <Info className="w-4 h-4 text-[#1976D2]" />}
                     </div>
                     <div className="flex-grow min-w-0">
                       <div className="text-[13px] font-bold text-[#1C1E21] break-words">{update.message}</div>
                       <div className="text-[10px] text-[#606770] font-bold uppercase tracking-wider mt-1 flex flex-wrap gap-2 items-center">
                         <span>{format(new Date(update.createdAt), 'MMM d, h:mm a')}</span>
                         {update.targetAudience && update.targetAudience !== 'all' && (
                           <span className="bg-[#E4E6EB] px-1.5 py-0.5 rounded text-[#1C1E21]">
                             Target: {update.targetAudience}
                           </span>
                         )}
                       </div>
                     </div>
                     <div className="flex gap-1 shrink-0">
                       <button onClick={() => setDeletingUpdateId(update.id)} className="p-1.5 text-[#606770] hover:text-[#D32F2F]"><Trash2 className="w-3.5 h-3.5" /></button>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {deletingUpdateId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 text-center">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-8 max-w-sm w-full">
              <Trash2 className="w-12 h-12 text-[#D32F2F] mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Delete Update?</h3>
              <p className="text-[14px] text-[#606770] mb-6">This will remove the update from the event.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingUpdateId(null)} className="flex-grow py-3 bg-[#F0F2F5] rounded-xl font-bold">Cancel</button>
                <button onClick={() => handleDeleteUpdate(deletingUpdateId)} className="flex-grow py-3 bg-[#D32F2F] text-white rounded-xl font-bold">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const SponsorSection = ({ sponsors, loading }: { sponsors: Sponsor[], loading: boolean }) => {
  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 py-8">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="aspect-square bg-[#F0F2F5] rounded-xl animate-pulse" />
      ))}
    </div>
  );

  if (sponsors.length === 0) return null;

  const tiers = {
    platinum: sponsors.filter(s => s.tier === 'platinum'),
    gold: sponsors.filter(s => s.tier === 'gold'),
    silver: sponsors.filter(s => s.tier === 'silver'),
    bronze: sponsors.filter(s => s.tier === 'bronze'),
    exhibitor: sponsors.filter(s => s.tier === 'exhibitor'),
  };

  return (
    <div className="space-y-8">
      {tiers.platinum.length > 0 && (
        <section>
          <h4 className="text-[10px] font-bold uppercase text-[#D32F2F] tracking-[0.2em] text-center mb-6">Platinum Partners</h4>
          <div className="flex flex-wrap justify-center gap-8">
            {tiers.platinum.map(s => (
              <a 
                key={s.id} 
                href={s.websiteUrl || '#'} 
                target={s.websiteUrl ? "_blank" : undefined}
                rel={s.websiteUrl ? "noopener noreferrer" : undefined}
                className="group relative"
              >
                <div className="w-44 h-28 bg-white border-2 border-[#E4E6EB] hover:border-[#D32F2F] rounded-2xl p-5 transition-all flex items-center justify-center shadow-sm hover:shadow-xl hover:-translate-y-1">
                  <img src={s.logoUrl} alt={s.name} className="max-w-full max-h-full object-contain filter grayscale group-hover:grayscale-0 transition-all" />
                </div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white border border-[#E4E6EB] px-3 py-1.5 rounded-xl text-center whitespace-nowrap shadow-xl z-10 w-[120%] max-w-[180px]">
                   <div className="text-[11px] font-black text-[#1C1E21] truncate">{s.name}</div>
                   {s.websiteUrl && (
                     <div className="text-[9px] text-[#1976D2] font-bold truncate mt-0.5">{s.websiteUrl.replace(/^https?:\/\/(www\.)?/, '')}</div>
                   )}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {(tiers.gold.length > 0 || tiers.silver.length > 0 || tiers.bronze.length > 0) && (
        <section>
          <h4 className="text-[10px] font-bold uppercase text-[#606770] tracking-[0.2em] text-center mb-6">Featured Sponsors</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...tiers.gold, ...tiers.silver, ...tiers.bronze].map(s => (
              <a 
                key={s.id} 
                href={s.websiteUrl || '#'} 
                target={s.websiteUrl ? "_blank" : undefined}
                rel={s.websiteUrl ? "noopener noreferrer" : undefined}
                className="bg-white border border-[#E4E6EB] rounded-xl p-5 flex flex-col items-center justify-center gap-3 hover:shadow-lg transition-all group hover:-translate-y-1"
              >
                <div className="w-20 h-20 shrink-0 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <img src={s.logoUrl} alt={s.name} className="max-w-full max-h-full object-contain" />
                </div>
                <div className="text-center overflow-hidden w-full">
                  <div className="text-[13px] font-bold text-[#1C1E21] truncate">{s.name}</div>
                  <div className="text-[9px] font-bold text-[#606770] uppercase opacity-60 mb-1">{s.tier}</div>
                  {s.websiteUrl && (
                    <div className="text-[10px] text-[#1976D2] font-bold truncate">
                      {s.websiteUrl.replace(/^https?:\/\/(www\.)?/, '')}
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {tiers.exhibitor.length > 0 && (
        <section>
          <h4 className="text-[10px] font-bold uppercase text-[#A0A0A0] tracking-[0.2em] text-center mb-4">Confirmed Exhibitors</h4>
          <div className="flex flex-wrap justify-center gap-3">
             {tiers.exhibitor.map(s => (
               <a 
                 key={s.id} 
                 href={s.websiteUrl || '#'} 
                 target={s.websiteUrl ? "_blank" : undefined}
                 rel={s.websiteUrl ? "noopener noreferrer" : undefined}
                 className="px-4 py-3 bg-[#F8F9FA] border border-[#E4E6EB] rounded-2xl flex flex-col items-center text-center hover:bg-white hover:border-[#1976D2] transition-all hover:shadow-md min-w-[120px]"
               >
                 <div className="w-6 h-6 rounded-md overflow-hidden shrink-0 bg-white mb-2 shadow-sm">
                   <img src={s.logoUrl} alt="" className="w-full h-full object-contain" />
                 </div>
                 <div className="text-[11px] font-bold text-[#606770]">{s.name}</div>
                 {s.websiteUrl && (
                   <div className="text-[9px] text-[#1976D2] font-bold truncate max-w-[100px] mt-0.5">
                     {s.websiteUrl.replace(/^https?:\/\/(www\.)?/, '')}
                   </div>
                 )}
               </a>
             ))}
          </div>
        </section>
      )}
    </div>
  );
};

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      setHasError(true);
      setErrorMsg(e.message);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-center">
        <div className="max-w-md bg-white p-8 rounded-2xl shadow-xl border border-red-100">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Info className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-600 mb-6">We encountered an unexpected error. This might be related to your Firebase configuration or network.</p>
          <div className="bg-red-50 p-4 rounded-lg text-left mb-6 overflow-auto max-h-40">
            <code className="text-xs text-red-800">{errorMsg}</code>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center"
    >
      <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
      <p className="text-gray-500 font-medium font-sans">Preparing Expo Experience...</p>
    </motion.div>
  </div>
);

const ProfileCompletionPrompt = ({ onGoToSettings, onDismiss }: { onGoToSettings: () => void, onDismiss: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#1976D2] text-white p-4 rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 relative pr-10"
    >
      <button 
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="Dismiss prompt"
      >
        <X className="w-4 h-4 text-white" />
      </button>
      <div className="flex items-center gap-4">
        <div className="bg-white/20 p-2 rounded-full">
          <GraduationCap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h4 className="font-bold text-[15px]">Complete Your Student Profile</h4>
          <p className="text-[12px] opacity-90">Please add your school and interests to unlock personalized scholarship recommendations.</p>
        </div>
      </div>
      <button 
        onClick={onGoToSettings}
        className="bg-white text-[#1976D2] px-5 py-2 rounded-lg font-bold text-[12px] whitespace-nowrap hover:bg-[#F0F2F5] transition-colors"
      >
        Go to Settings
      </button>
    </motion.div>
  );
};

const UserRoleSelector = ({ onSelect }: { onSelect: (role: Role) => void }) => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to NCRF College Expo</h2>
        <p className="text-gray-600">Please select your role to customize your experience.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: GraduationCap, role: 'student', title: 'Student', desc: 'Find colleges, scholarships, and resources for your future.' },
          { icon: Users, role: 'parent', title: 'Parent', desc: 'Support your child’s educational journey with expert advice.' },
          { icon: Briefcase, role: 'recruiter', title: 'Recruiter', desc: 'Capture leads and connect with talent at the expo.' },
          { icon: CreditCard, role: 'admin', title: 'Administrator', desc: 'Manage events, vendors, and attendee data.' }
        ].map((item) => (
          <motion.button
            key={item.role}
            whileHover={{ y: -5 }}
            onClick={() => onSelect(item.role as Role)}
            className="flex flex-col items-center p-8 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all text-center"
          >
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl mb-6">
              <item.icon className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
            <p className="text-sm text-gray-500">{item.desc}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

const NotificationCenter = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { notifications, markAsRead } = useContext(UserContext);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-[60]"
          />
          <motion.div 
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-0 top-0 h-full w-[350px] bg-white shadow-2xl z-[70] border-l border-[#E4E6EB] flex flex-col"
          >
            <div className="p-5 border-b border-[#E4E6EB] flex items-center justify-between bg-[#F8F9FA]">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#D32F2F]" />
                <h3 className="font-bold text-[#1C1E21]">Notifications</h3>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-[#E4E6EB] rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-grow overflow-y-auto no-scrollbar p-0">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 text-center opacity-40 h-full">
                  <Bell className="w-10 h-10 mb-2" />
                  <p className="text-[13px] font-medium">No new notifications</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={cn(
                      "p-5 border-b border-[#F0F2F5] transition-colors relative",
                      !notif.read ? "bg-[#FFF5F5] border-l-4 border-l-[#D32F2F]" : "bg-white"
                    )}
                  >
                    {!notif.read && (
                      <button 
                        onClick={() => markAsRead(notif.id)}
                        className="absolute top-2 right-2 text-[10px] uppercase font-bold text-[#1976D2] hover:underline"
                      >
                        Mark as read
                      </button>
                    )}
                    <div className="text-[10px] font-bold uppercase text-[#606770] mb-1">
                      {notif.type} • {format(new Date(notif.createdAt), 'MMM dd, p')}
                    </div>
                    <div className="text-[14px] font-bold text-[#1C1E21] mb-1">{notif.title}</div>
                    <div className="text-[12px] text-[#606770] leading-snug">{notif.message}</div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const NotificationBroadcaster = () => {
  const { user } = useContext(UserContext);
  const [audience, setAudience] = useState<'all' | 'role' | 'individual'>('role');
  const [targetRole, setTargetRole] = useState<Role>('student');
  const [targetId, setTargetId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'alert' | 'update' | 'reminder'>('update');
  const [sending, setSending] = useState(false);

  if (user?.role !== 'admin') return null;

  const handleBroadcast = async () => {
    if (!title || !message) return alert('Please enter title and message');
    if (audience === 'individual' && !targetId) return alert('Please enter target user UID');

    setSending(true);
    try {
      let targetUids: string[] = [];

      if (audience === 'individual') {
        targetUids = [targetId];
      } else {
        const usersRef = collection(db, 'users');
        const q = audience === 'role' 
          ? query(usersRef, where('role', '==', targetRole))
          : usersRef;
        
        const snapshot = await getDocs(q);
        targetUids = snapshot.docs.map(doc => doc.id);
      }

      if (targetUids.length === 0) {
        alert('No target users found for selected audience.');
        setSending(false);
        return;
      }

      // Process in batches of 500 (Firestore limit)
      const batches = [];
      for (let i = 0; i < targetUids.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = targetUids.slice(i, i + 500);
        
        chunk.forEach(uid => {
          const notifRef = doc(collection(db, `users/${uid}/notifications`));
          batch.set(notifRef, {
            title,
            message,
            type,
            read: false,
            createdAt: new Date().toISOString()
          });
        });
        batches.push(batch.commit());
      }

      await Promise.all(batches);
      alert(`Successfully broadcasted to ${targetUids.length} users!`);
      setTitle('');
      setMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'broadcast_notifications');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-[#E4E6EB] p-6 shadow-sm mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-[#D32F2F]" />
        <h3 className="text-[14px] font-bold text-[#1C1E21] uppercase tracking-wider">Broadcast System Notification</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#606770] mb-1.5">Target Audience</label>
            <div className="flex gap-2 p-1 bg-[#F0F2F5] rounded-lg">
              {['role', 'all', 'individual'].map((target) => (
                <button
                  key={target}
                  onClick={() => setAudience(target as any)}
                  className={cn(
                    "flex-grow py-1.5 text-[11px] font-bold uppercase rounded-md transition-all capitalize",
                    audience === target ? "bg-white text-[#1976D2] shadow-sm" : "text-[#606770] hover:text-[#1C1E21]"
                  )}
                >
                  {target}
                </button>
              ))}
            </div>
          </div>

          {audience === 'role' && (
            <div>
              <label className="block text-[10px] font-bold uppercase text-[#606770] mb-1.5">Target Role</label>
              <select 
                value={targetRole} 
                onChange={(e) => setTargetRole(e.target.value as Role)}
                className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#1976D2]"
              >
                <option value="student">Students</option>
                <option value="parent">Parents</option>
                <option value="admin">Administrators</option>
              </select>
            </div>
          )}

          {audience === 'individual' && (
            <div>
              <label className="block text-[10px] font-bold uppercase text-[#606770] mb-1.5">User UID</label>
              <input 
                type="text" 
                value={targetId} 
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="Paste UID here..."
                className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#1976D2]"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase text-[#606770] mb-1.5">Notification Type</label>
            <div className="flex gap-3">
              {(['update', 'alert', 'reminder'] as const).map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="radio" 
                    name="notifType" 
                    value={t} 
                    checked={type === t}
                    onChange={() => setType(t)}
                    className="sr-only"
                  />
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                    type === t ? "border-[#D32F2F] bg-[#D32F2F]" : "border-[#CCC] group-hover:border-[#606770]"
                  )}>
                    {type === t && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  <span className={cn(
                    "text-[12px] font-bold capitalize",
                    type === t ? "text-[#1C1E21]" : "text-[#606770]"
                  )}>{t}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#606770] mb-1.5">Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Schedule Change for LA Expo"
              className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#1976D2]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#606770] mb-1.5">Message Content</label>
            <textarea 
              value={message} 
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Detailed explanation of the announcement..."
              rows={4}
              className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#1976D2] resize-none"
            />
          </div>
          <button 
            onClick={handleBroadcast}
            disabled={sending}
            className="w-full py-3 bg-[#D32F2F] text-white font-bold rounded-lg text-[13px] uppercase tracking-widest hover:bg-black transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Broadcast to Audience
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const NCRFScholarshipCorner = () => {
  const { user } = useContext(UserContext);
  const [loading, setLoading] = useState(false);

  // Exclusive list of scholarships for premium members
  const exclusiveScholarships = [
    { title: 'NCRF Academic Excellence Award', amount: '$10,000', deadline: 'Oct 31, 2026', desc: 'For students demonstrating outstanding academic achievement in underrepresented communities.' },
    { title: 'Future Leaders of STEM', amount: '$5,000', deadline: 'Dec 15, 2026', desc: 'Funded by participating corporations to support aspiring engineers.' },
    { title: 'Community Impact Grant', amount: '$2,500', deadline: 'Nov 30, 2026', desc: 'Awarded to students with a proven track record of local volunteer work.' },
    { title: 'First-Generation Scholar', amount: '$7,500', deadline: 'Jan 15, 2027', desc: 'Exclusive funding for students who will be the first in their family to attend college.' }
  ];

  const handleSubscribe = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch('/api/create-scholarship-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: user.uid })
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Error initiating checkout: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Could not connect to payment server.');
    } finally {
      setLoading(false);
    }
  };

  if (!user?.hasScholarshipAccess) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#E4E6EB] max-w-3xl mx-auto text-center mt-10">
        <Star className="w-16 h-16 text-[#F57F17] mx-auto mb-4" />
        <h2 className="text-2xl font-black text-[#1C1E21] mb-2">NCRF Scholarship Corner Access</h2>
        <p className="text-[#606770] mb-6 max-w-lg mx-auto">
          Upgrade to receive our curated, exclusive list of scholarships specifically selected by the NCRF team for parents and students. Gain the competitive edge for just <strong>$5/month</strong>.
        </p>
        <button 
          onClick={handleSubscribe} 
          disabled={loading}
          className="bg-gradient-to-r from-[#F57F17] to-[#F57C00] text-white px-8 py-3 rounded-lg font-bold text-lg hover:shadow-lg transition-all transform hover:-translate-y-0.5"
        >
          {loading ? 'Processing...' : 'Subscribe Now for $5/mo'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#FFF8E1] to-[#FFF3E0] p-6 rounded-2xl border border-[#FFE082] flex gap-4 items-center">
        <Star className="w-10 h-10 text-[#F57F17]" />
        <div>
          <h2 className="text-xl font-bold text-[#F57F17]">Premium NCRF Scholarships</h2>
          <p className="text-[#E65100]/80 font-medium">You have unlocked our exclusive curated list.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exclusiveScholarships.map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-[#E4E6EB] shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-bold text-[#1C1E21] text-lg">{s.title}</h3>
            <div className="text-[#1976D2] font-black text-xl my-2">{s.amount}</div>
            <p className="text-[13px] text-[#606770] mb-4">{s.desc}</p>
            <div className="flex justify-between items-center pt-4 border-t border-[#F0F2F5]">
              <span className="text-[11px] font-bold text-[#D32F2F] uppercase">Deadline: {s.deadline}</span>
              <button className="text-[12px] font-bold text-[#1976D2] bg-[#E3F2FD] px-3 py-1.5 rounded-lg hover:bg-[#BBDEFB]">
                Apply Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ScholarshipTracker = () => {
  const { user } = useContext(UserContext);
  const [apps, setApps] = useState<ScholarshipApplication[]>([
    { 
      id: '1', 
      name: 'NCRF STEM Scholarship', 
      provider: 'NCRF Foundation', 
      amount: 5000, 
      deadline: '2026-11-15', 
      status: 'pending',
      essay: 'My passion for STEM began in middle school when I first learned about robotics...',
      documents: [
        { name: 'Transcript_Official.pdf', url: '#', type: 'PDF' },
        { name: 'Recommendation_Letter_Smith.pdf', url: '#', type: 'PDF' }
      ]
    },
    { 
      id: '2', 
      name: 'Future Leaders Grant', 
      provider: 'Community Trust', 
      amount: 2500, 
      deadline: '2026-12-01', 
      status: 'draft',
      notes: 'Need to finish the community service section.'
    },
    { 
      id: '3', 
      name: 'Academic Excellence Award', 
      provider: 'City Council', 
      amount: 1000, 
      deadline: '2026-04-10', 
      status: 'awarded' 
    },
  ]);

  const [selectedApp, setSelectedApp] = useState<ScholarshipApplication | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ScholarshipApplication>>({});

  const stats = {
    totalAwarded: apps.filter(a => a.status === 'awarded').reduce((acc, curr) => acc + curr.amount, 0),
    pendingAmount: apps.filter(a => a.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0),
    upcomingDeadlines: apps.filter(a => (a.status === 'draft' || a.status === 'pending') && new Date(a.deadline) > new Date()).length
  };

  const handleEditClick = (app: ScholarshipApplication) => {
    setSelectedApp(app);
    setEditForm(app);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!selectedApp) return;
    setApps(apps.map(a => a.id === selectedApp.id ? { ...a, ...editForm } as ScholarshipApplication : a));
    setIsEditing(false);
    setSelectedApp(null);
  };

  if (user?.role !== 'student') return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-[#E4E6EB] shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-[#606770] tracking-widest mb-0.5">Total Awarded</div>
            <div className="text-2xl font-black text-[#1C1E21] tracking-tight">${stats.totalAwarded.toLocaleString()}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#E4E6EB] shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="w-12 h-12 bg-[#FFF5F5] text-[#D32F2F] rounded-2xl flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-[#606770] tracking-widest mb-0.5">Pending Potential</div>
            <div className="text-2xl font-black text-[#1C1E21] tracking-tight">${stats.pendingAmount.toLocaleString()}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#E4E6EB] shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="w-12 h-12 bg-[#E3F2FD] text-[#1976D2] rounded-2xl flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-[#606770] tracking-widest mb-0.5">Active Tasks</div>
            <div className="text-2xl font-black text-[#1C1E21] tracking-tight">{stats.upcomingDeadlines}</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl border border-[#E4E6EB] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-[#F0F2F5] flex items-center justify-between bg-white">
          <div>
            <h3 className="font-black text-[#1C1E21] text-lg tracking-tight">Application Tracker</h3>
            <p className="text-[12px] text-[#606770] font-medium">Manage and track your funding progress.</p>
          </div>
          <button className="px-4 py-2 bg-[#1A2233] text-white text-[11px] font-black rounded-xl hover:bg-black flex items-center gap-2 transition-all shadow-lg active:scale-95 uppercase tracking-wider">
            <Plus className="w-4 h-4" />
            Add New App
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F9FA] text-[10px] font-black uppercase text-[#606770] tracking-[0.15em] border-b border-[#F0F2F5]">
                <th className="px-6 py-5">Scholarship Name</th>
                <th className="px-6 py-5">Provider</th>
                <th className="px-6 py-5">Amount</th>
                <th className="px-6 py-5">Deadline</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F2F5]">
              {apps.map((app) => (
                <tr key={app.id} className="hover:bg-[#F8F9FA]/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="text-[14px] font-bold text-[#1C1E21] group-hover:text-[#1976D2] transition-colors cursor-pointer" onClick={() => handleEditClick(app)}>
                      {app.name}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-[13px] text-[#606770] font-medium">{app.provider}</td>
                  <td className="px-6 py-5">
                    <div className="text-[13px] font-extrabold text-[#1C1E21]">${app.amount.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className={cn(
                      "text-[12px] font-bold",
                      new Date(app.deadline) < new Date() ? "text-[#D32F2F]" : "text-[#1C1E21]"
                    )}>
                      {format(new Date(app.deadline), 'MMM dd, yyyy')}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={cn(
                      "text-[9px] uppercase font-black px-2.5 py-1 rounded-full border shadow-sm",
                      app.status === 'awarded' && "bg-[#E8F5E9] text-[#2E7D32] border-[#2E7D32]/10",
                      app.status === 'pending' && "bg-[#E3F2FD] text-[#1565C0] border-[#1565C0]/10",
                      app.status === 'rejected' && "bg-[#FFEBEE] text-[#C62828] border-[#C62828]/10",
                      app.status === 'draft' && "bg-[#F5F5F5] text-[#616161] border-[#616161]/10"
                    )}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEditClick(app)}
                        className="p-2 hover:bg-[#E4E6EB] rounded-lg text-[#606770] transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-[#F8F9FA] border-t border-[#F0F2F5] text-center">
           <button className="text-[11px] font-bold text-[#1976D2] hover:underline uppercase tracking-widest">
             View Archived Applications
           </button>
        </div>
      </div>

      {/* Detailed Edit View / Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-[#F0F2F5] flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-[#1C1E21]">{editForm.name} Details</h3>
                  <p className="text-[12px] text-[#606770] font-bold uppercase tracking-widest">Application Management</p>
                </div>
                <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-[#F0F2F5] rounded-full transition-colors">
                  <X className="w-6 h-6 text-[#606770]" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column: Basic Info */}
                  <div className="space-y-6">
                    <div className="bg-[#F8F9FA] p-6 rounded-2xl border border-[#E4E6EB]">
                      <h4 className="text-[10px] font-bold uppercase text-[#D32F2F] tracking-[0.2em] mb-4">Core Information</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5">Scholarship Name</label>
                          <input 
                            type="text" 
                            value={editForm.name} 
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full bg-white border border-[#E4E6EB] rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-[#1976D2] font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5">Provider</label>
                          <input 
                            type="text" 
                            value={editForm.provider} 
                            onChange={(e) => setEditForm(prev => ({ ...prev, provider: e.target.value }))}
                            className="w-full bg-white border border-[#E4E6EB] rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-[#1976D2] font-semibold"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5">Amount ($)</label>
                            <input 
                              type="number" 
                              value={editForm.amount} 
                              onChange={(e) => setEditForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                              className="w-full bg-white border border-[#E4E6EB] rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-[#1976D2] font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold uppercase text-[#606770] mb-1.5">Status</label>
                            <select 
                              value={editForm.status} 
                              onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                              className="w-full bg-white border border-[#E4E6EB] rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-[#1976D2] font-semibold"
                            >
                              <option value="draft">Draft</option>
                              <option value="pending">Pending</option>
                              <option value="awarded">Awarded</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#F8F9FA] p-6 rounded-2xl border border-[#E4E6EB]">
                      <h4 className="text-[10px] font-bold uppercase text-[#D32F2F] tracking-[0.2em] mb-4">Supporting Documents</h4>
                      <div className="space-y-3">
                        {editForm.documents?.map((doc, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-white border border-[#E4E6EB] rounded-xl group">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-red-50 text-[#D32F2F] rounded-lg">
                                <Download className="w-4 h-4" />
                              </div>
                              <span className="text-[13px] font-bold text-[#1C1E21]">{doc.name}</span>
                            </div>
                            <button className="text-[#606770] hover:text-[#D32F2F] transition-colors p-1 opacity-0 group-hover:opacity-100">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button className="w-full py-4 border-2 border-dashed border-[#CCC] rounded-2xl text-[12px] font-bold text-[#606770] hover:border-[#1976D2] hover:text-[#1976D2] transition-all flex flex-col items-center justify-center gap-2 mt-4">
                           <Plus className="w-5 h-5" />
                           Drop files or click to upload
                           <span className="text-[9px] font-medium opacity-60">Transcripts, Recommendation Letters, etc.</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Essays & Notes */}
                  <div className="space-y-6">
                    <div className="bg-[#F8F9FA] p-6 rounded-2xl border border-[#E4E6EB] h-[340px] flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[10px] font-bold uppercase text-[#D32F2F] tracking-[0.2em]">Application Essay</h4>
                        <span className="text-[10px] font-mono font-bold text-[#606770]">Word Count: {editForm.essay?.split(/\s+/).filter(x => x).length || 0}</span>
                      </div>
                      <textarea 
                        value={editForm.essay} 
                        onChange={(e) => setEditForm(prev => ({ ...prev, essay: e.target.value }))}
                        placeholder="Paste your essay here for storage and quick editing..."
                        className="flex-grow w-full bg-white border border-[#E4E6EB] rounded-2xl p-5 text-[14px] leading-relaxed outline-none focus:border-[#1976D2] resize-none font-medium custom-scrollbar"
                      />
                    </div>

                    <div className="bg-[#F8F9FA] p-6 rounded-2xl border border-[#E4E6EB]">
                      <h4 className="text-[10px] font-bold uppercase text-[#D32F2F] tracking-[0.2em] mb-4">Additional Notes</h4>
                      <textarea 
                        value={editForm.notes} 
                        onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Internal reminders, follow-up dates, or requirements..."
                        rows={4}
                        className="w-full bg-white border border-[#E4E6EB] rounded-2xl p-4 text-[14px] outline-none focus:border-[#1976D2] resize-none font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-[#F0F2F5] bg-[#F8F9FA] flex items-center justify-end gap-3">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2.5 text-[13px] font-black uppercase tracking-widest text-[#606770] hover:text-[#1C1E21]"
                >
                  Discard Changes
                </button>
                <button 
                  onClick={handleSave}
                  className="px-8 py-2.5 bg-[#1A2233] text-white text-[13px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-lg active:scale-95"
                >
                  Save Application
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Navbar = ({ onOpenNotifications }: { onOpenNotifications: () => void }) => {
  const { user, logout, notifications } = useContext(UserContext);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="h-[70px] bg-white border border-[#E4E6EB] rounded-lg flex items-center justify-between px-5 mb-4 shadow-sm">
      <div className="flex items-center gap-3">
        <img 
          src={LOGO_URL} 
          alt="NCRF Logo" 
          className="h-12 w-auto" 
          referrerPolicy="no-referrer"
        />
        <div className="hidden sm:block">
          <div className="text-[10px] font-bold text-[#606770] uppercase tracking-[0.2em] leading-none mb-1">
            Official Portal
          </div>
          <div className="text-[10px] font-bold text-[#D32F2F] uppercase tracking-widest">
            Expo 2026
          </div>
        </div>
      </div>

      {user && (
        <div className="flex items-center gap-5">
          <div className="text-[12px] text-[#606770] hidden sm:block">
            Status: <span className="font-bold text-[#1C1E21]">Check-in Open</span>
          </div>
          <button 
            onClick={onOpenNotifications}
            className="relative p-2 bg-[#F0F2F5] rounded-full hover:bg-[#E4E6EB] transition-colors"
          >
            <Bell className="w-4 h-4 text-[#1C1E21]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#D32F2F] text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          <button 
            onClick={logout}
            className="p-2 text-[#606770] hover:text-[#D32F2F] transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </header>
  );
};

const BoothMap = () => {
  const [selectedBooth, setSelectedBooth] = useState<{ name: string, premium: boolean, description?: string, representative?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSponsorsOnly, setShowSponsorsOnly] = useState(false);

  const booths = [
    { name: 'UCLA', premium: true, description: 'University of California, Los Angeles. Top-tier research university.', representative: 'Sarah Johnson' },
    { name: 'Morehouse', premium: false, description: 'Historically Black men’s liberal arts college in Atlanta.', representative: 'Marcus Brown' },
    { name: 'NASA', premium: false, description: 'National Aeronautics and Space Administration. Inspiring the next generation.', representative: 'Dr. Ellen Ochoa' },
    { name: 'Spelman', premium: false, description: 'Historically Black women’s liberal arts college in Atlanta.', representative: 'Aaliyah Smith' },
    { name: 'US Navy', premium: false, description: 'Career opportunities and scholarships through military service.', representative: 'Cmdr. James Wilson' },
    { name: 'USC', premium: false, description: 'University of Southern California. Private research university in LA.', representative: 'Michael Chen' },
    { name: 'Wells Fargo', premium: false, description: 'Financial literacy and student banking resources.', representative: 'David Rodriguez' },
    { name: 'HBCU Hub', premium: true, description: 'One-stop shop for all your HBCU questions and resources.', representative: 'Keisha Taylor' },
    { name: 'Howard', premium: false, description: 'Howard University. Historically Black research university in DC.', representative: 'Dr. Wayne Frederick' },
    { name: 'Cal Poly', premium: false, description: 'California Polytechnic State University. Learn by doing.', representative: 'Jennifer Lopez' },
    { name: 'Google', premium: false, description: 'Tech careers and internships for students.', representative: 'Sundar Pichai' },
    { name: 'FAMU', premium: false, description: 'Florida A&M University. Public HBCU in Tallahassee.', representative: 'Larry Robinson' },
    { name: 'CSU LA', premium: false, description: 'California State University, Los Angeles.', representative: 'William Covino' },
    { name: 'Nike', premium: false, description: 'Sports management and design career pathways.', representative: 'John Donahoe' },
    { name: 'Tuskegee', premium: false, description: 'Tuskegee University. Private HBCU in Alabama.', representative: 'Charlotte Morris' },
    { name: 'NCRF Admin', premium: true, description: 'National College Resources Foundation headquarters.', representative: 'Theresa Price' },
    { name: 'Microsoft', premium: false, description: 'Software engineering and cloud computing workshops.', representative: 'Satya Nadella' },
    { name: 'Morgan St', premium: false, description: 'Morgan State University. Maryland’s Preeminent Public Urban Research University.', representative: 'David Wilson' },
    { name: 'Amazon', premium: false, description: 'AWS Educate and career opportunities.', representative: 'Andy Jassy' },
    { name: 'Clark Atl', premium: false, description: 'Clark Atlanta University. Private HBCU in Atlanta.', representative: 'George French Jr.' },
    { name: 'UC Berk', premium: false, description: 'University of California, Berkeley.', representative: 'Carol Christ' },
    { name: 'Delta', premium: false, description: 'Aviation and aerospace scholarships.', representative: 'Ed Bastian' },
    { name: 'A&T State', premium: false, description: 'North Carolina A&T State University.', representative: 'Harold Martin Sr.' },
    { name: 'Chevron', premium: false, description: 'STEM careers and energy sector resources.', representative: 'Mike Wirth' },
    { name: 'Grambling', premium: false, description: 'Grambling State University. HBCU in Louisiana.', representative: 'Rick Gallot' },
    { name: 'Yale', premium: false, description: 'Yale University undergraduate admissions.', representative: 'Peter Salovey' },
    { name: 'Xavier', premium: false, description: 'Xavier University of Louisiana. Historically Black Catholic university.', representative: 'Reynold Verret' },
    { name: 'Disney', premium: false, description: 'Disney on the Yard and creative career pathways.', representative: 'Bob Iger' },
    { name: 'Hampton', premium: false, description: 'Hampton University. Private HBCU in Virginia.', representative: 'William Harvey' },
    { name: 'Stanford', premium: false, description: 'Stanford University. Leading research university.', representative: 'Marc Tessier-Lavigne' }
  ];

  const filteredBooths = booths.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (!showSponsorsOnly || b.premium)
  );

  return (
    <div className="bg-white rounded-lg border border-[#E4E6EB] p-5 flex flex-col h-full shadow-sm relative">
      <div className="text-[11px] font-bold uppercase text-[#606770] mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span>Main Floor Layout</span>
          <button 
            onClick={() => setShowSponsorsOnly(!showSponsorsOnly)}
            className={cn(
              "px-2 py-0.5 rounded border transition-all flex items-center gap-1",
              showSponsorsOnly 
                ? "bg-[#1976D2] border-[#1976D2] text-white" 
                : "bg-white border-[#E4E6EB] text-[#606770] hover:border-[#1976D2]"
            )}
          >
            <Star className={cn("w-3 h-3", showSponsorsOnly ? "fill-white" : "")} />
            Sponsors Only
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#606770]" />
          <input 
            type="text" 
            placeholder="Search booths..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-[#F0F2F5] border border-transparent rounded-lg text-[12px] outline-none focus:border-[#1976D2] w-full md:w-48 placeholder:text-[#606770]/60"
          />
        </div>
      </div>
      
      <div className="flex-grow bg-[#F8F9FA] border border-dashed border-[#CCC] rounded relative overflow-hidden">
        <TransformWrapper
          initialScale={1}
          initialPositionX={0}
          initialPositionY={0}
          minScale={0.5}
          maxScale={3}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* Zoom Controls */}
              <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                <button 
                  onClick={() => zoomIn()}
                  className="p-2 bg-white border border-[#E4E6EB] rounded-lg shadow-sm hover:bg-[#F0F2F5] transition-colors text-[#606770]"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => zoomOut()}
                  className="p-2 bg-white border border-[#E4E6EB] rounded-lg shadow-sm hover:bg-[#F0F2F5] transition-colors text-[#606770]"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => resetTransform()}
                  className="p-2 bg-white border border-[#E4E6EB] rounded-lg shadow-sm hover:bg-[#F0F2F5] transition-colors text-[#606770]"
                  title="Reset View"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>
              </div>

              <TransformComponent
                wrapperStyle={{ width: "100%", height: "100%" }}
                contentStyle={{ width: "100%", height: "100%", padding: "20px" }}
              >
                <div className="grid grid-cols-4 md:grid-cols-6 gap-3 w-full">
                  {filteredBooths.length > 0 ? (
                    filteredBooths.map((booth, i) => (
                      <motion.div 
                        key={i} 
                        whileHover={{ scale: 1.05, zIndex: 10 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedBooth(booth)}
                        className={cn(
                          "flex items-center justify-center text-[10px] text-center p-2 font-medium border border-[#E4E6EB] transition-all cursor-pointer shadow-sm min-h-[60px]",
                          booth.premium ? "bg-[#E3F2FD] border-[#1976D2] text-[#1976D2] font-bold" : "bg-white text-[#606770] hover:border-[#1976D2]"
                        )}
                      >
                        {booth.name}
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full flex flex-col items-center justify-center text-[#606770] opacity-50 py-12">
                      <Search className="w-8 h-8 mb-2" />
                      <span className="text-[12px] font-bold">
                        {showSponsorsOnly 
                          ? `No sponsors matching "${searchQuery}"` 
                          : `No booths matching "${searchQuery}"`}
                      </span>
                    </div>
                  )}
                </div>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>

        {/* Booth Detail Overlay */}
        <AnimatePresence>
          {selectedBooth && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute inset-x-3 bottom-3 bg-white border border-[#1976D2] shadow-xl rounded-lg p-4 z-20 flex flex-col"
            >
              <button 
                onClick={() => setSelectedBooth(null)}
                className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-[#606770]" />
              </button>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-bold text-[#1C1E21]">{selectedBooth.name}</h4>
                {selectedBooth.premium && (
                  <span className="text-[9px] bg-[#D32F2F] text-white px-1.5 py-0.5 rounded font-black uppercase">Premium</span>
                )}
              </div>
              <p className="text-[11px] text-[#606770] mb-3 leading-relaxed">{selectedBooth.description}</p>
              <div className="mt-auto flex items-center justify-between border-t border-[#F0F2F5] pt-3">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-[#D32F2F]">Representative</span>
                  <span className="text-[12px] font-semibold text-[#1C1E21]">{selectedBooth.representative}</span>
                </div>
                <button className="px-3 py-1.5 bg-[#1976D2] text-white text-[10px] font-bold rounded hover:bg-[#1565C0]">
                  Get Virtual Brochure
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 flex items-center gap-4 text-[10px] text-[#606770] font-medium">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-[#E3F2FD] border border-[#1976D2]" />
          <span>Premium Partner</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-white border border-[#E4E6EB]" />
          <span>General Vendor</span>
        </div>
      </div>
    </div>
  );
};

const DateCard: React.FC<{ month: string, day: string, city: string, active?: boolean, onClick?: () => void }> = ({ month, day, city, active, onClick }) => (
  <div 
    onClick={onClick}
    className={cn(
      "min-w-[140px] border border-[#E4E6EB] rounded-lg p-3 flex flex-col items-center transition-all cursor-pointer hover:shadow-md",
      active ? "border-[#D32F2F] bg-[#FFF5F5]" : "bg-white"
    )}
  >
    <span className="text-[10px] uppercase font-bold text-[#606770]">{month}</span>
    <span className="text-2xl font-extrabold my-1">{day}</span>
    <span className="text-[12px] font-semibold">{city}</span>
  </div>
);

const StudentPortal = ({ user, setActiveView }: { user: AppUser, setActiveView: (view: any) => void }) => {
  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      <div className="bg-[#1976D2] rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10 w-full md:w-auto">
           <h1 className="text-4xl font-black mb-2 tracking-tight">Welcome, {user.displayName.split(' ')[0]}!</h1>
           <p className="text-white/80 font-medium text-lg leading-snug max-w-xl">
             Your NCRF Expo journey starts here. Access your digital ID, connect with recruiters, and find your dream college.
           </p>
        </div>
        <div className="relative z-10 shrink-0 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 text-center w-full md:w-auto">
          <div className="text-[11px] uppercase tracking-widest font-bold opacity-80 mb-1">Student Status</div>
          <div className="text-xl font-black flex items-center justify-center gap-2">
            <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(7ade80,0.5)]"></span>
            Registered
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-[#E4E6EB] shadow-sm p-6">
            <h2 className="text-lg font-black text-[#1C1E21] tracking-tight mb-4 flex items-center justify-between">
              Your Digital ID
              <span className="bg-[#E8F5E9] text-[#2E7D32] px-2 py-0.5 rounded text-[10px] font-bold uppercase">Active</span>
            </h2>
            <StudentDigitalCard user={user} />
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div 
              onClick={() => setActiveView('scholarship')}
              className="bg-white rounded-2xl border border-[#E4E6EB] p-6 hover:shadow-lg hover:border-[#D32F2F] transition-all cursor-pointer group flex flex-col items-start h-full"
            >
              <div className="w-12 h-12 bg-[#FFF5F5] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 text-[#D32F2F]" />
              </div>
              <h3 className="text-lg font-black text-[#1C1E21] mb-2 group-hover:text-[#D32F2F] transition-colors">Scholarship Center</h3>
              <p className="text-[13px] text-[#606770] leading-relaxed mb-4 flex-grow">Track your scholarship applications and discover financial aid opportunities tailored for you.</p>
              <div className="mt-auto flex items-center gap-2 text-[12px] font-bold text-[#D32F2F] uppercase tracking-wider">
                Explore <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            <div 
              onClick={() => setActiveView('scholarship-corner')}
              className="bg-gradient-to-br from-[#FFF8E1] to-[#FFF3E0] rounded-2xl border border-[#FFE082] p-6 hover:shadow-lg hover:border-[#F57F17] transition-all cursor-pointer group flex flex-col items-start h-full relative overflow-hidden"
            >
              <div className="absolute -top-4 -right-4 opacity-10 group-hover:scale-110 transition-transform">
                <Star className="w-32 h-32 text-[#F57F17]" />
              </div>
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm relative z-10 border border-[#FFE082]">
                <Star className="w-6 h-6 text-[#F57F17]" />
              </div>
              <h3 className="text-lg font-black text-[#F57F17] mb-2 relative z-10">NCRF Premium Scholarships</h3>
              <p className="text-[13px] text-[#E65100]/80 font-medium leading-relaxed mb-4 flex-grow relative z-10">Exclusive curated list for parents and students. Gain the competitive edge.</p>
              <div className="mt-auto flex items-center gap-2 text-[12px] font-bold text-[#F57F17] uppercase tracking-wider relative z-10">
                Unlock Now <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            <div 
              onClick={() => setActiveView('workshops')}
              className="bg-white rounded-2xl border border-[#E4E6EB] p-6 hover:shadow-lg hover:border-[#1976D2] transition-all cursor-pointer group flex flex-col items-start h-full"
            >
              <div className="w-12 h-12 bg-[#E3F2FD] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6 text-[#1976D2]" />
              </div>
              <h3 className="text-lg font-black text-[#1C1E21] mb-2 group-hover:text-[#1976D2] transition-colors">Workshop Schedule</h3>
              <p className="text-[13px] text-[#606770] leading-relaxed mb-4 flex-grow">Plan your day. See upcoming seminars, HBCU panels, and expert-led sessions.</p>
              <div className="mt-auto flex items-center gap-2 text-[12px] font-bold text-[#1976D2] uppercase tracking-wider">
                View Schedule <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            <div 
              onClick={() => setActiveView('floorplan')}
              className="bg-white rounded-2xl border border-[#E4E6EB] p-6 hover:shadow-lg hover:border-[#1C1E21] transition-all cursor-pointer group flex flex-col items-start h-full"
            >
              <div className="w-12 h-12 bg-[#F0F2F5] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MapPin className="w-6 h-6 text-[#1C1E21]" />
              </div>
              <h3 className="text-lg font-black text-[#1C1E21] mb-2 group-hover:text-[#1C1E21] transition-colors">Interactive Map</h3>
              <p className="text-[13px] text-[#606770] leading-relaxed mb-4 flex-grow">Find your way around the expo floor. Locate college booths and resources.</p>
              <div className="mt-auto flex items-center gap-2 text-[12px] font-bold text-[#1C1E21] uppercase tracking-wider">
                Open Map <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            <div 
              onClick={() => setActiveView('settings')}
              className="bg-white rounded-2xl border border-[#E4E6EB] p-6 hover:shadow-lg hover:border-gray-500 transition-all cursor-pointer group flex flex-col items-start h-full"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Settings className="w-6 h-6 text-gray-700" />
              </div>
              <h3 className="text-lg font-black text-[#1C1E21] mb-2">Profile Settings</h3>
              <p className="text-[13px] text-[#606770] leading-relaxed mb-4 flex-grow">Keep your information up to date to ensure recruiters have your latest details.</p>
              <div className="mt-auto flex items-center gap-2 text-[12px] font-bold text-gray-700 uppercase tracking-wider">
                Edit Profile <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E4E6EB] shadow-sm p-6 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFF5F5] rounded-bl-full -z-0"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 bg-[#D32F2F] rounded-2xl flex items-center justify-center shrink-0 shadow-lg text-white font-black text-xl">
                 <Camera className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-[#1C1E21] mb-1">Make an Impression</h3>
                <p className="text-[#606770] text-[14px]">Update your profile with a professional photo and double-check your major/graduation year. This is the information recruiters will see when you scan your card.</p>
              </div>
              <button 
                onClick={() => setActiveView('settings')}
                className="shrink-0 px-6 py-3 bg-[#1C1E21] text-white font-bold rounded-xl hover:bg-[#D32F2F] transition-colors shadow-md"
              >
                Update Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ events, onSelectEvent, setActiveView }: { events: ExpoEvent[], onSelectEvent: (event: ExpoEvent) => void, setActiveView: (view: string) => void }) => {
  const { user } = useContext(UserContext);
  const [globalUpdates, setGlobalUpdates] = useState<(EventUpdate & { eventName: string })[]>([]);

  useEffect(() => {
    if (events.length === 0) return;

    // To avoid complex indexes, we can just attach listeners to the visible events
    const unsubscribes = events.map(event => {
      const q = query(collection(db, 'events', event.id, 'updates'), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        setGlobalUpdates(prev => {
          // Remove old updates for this event
          let next = prev.filter(u => u.eventId !== event.id);
          // Add new updates
          const fetched = snapshot.docs.map(doc => ({ id: doc.id, eventName: event.name, ...doc.data() } as EventUpdate & { eventName: string }))
            .filter(u => !u.targetAudience || u.targetAudience === 'all' || u.targetAudience === user?.role);
          next = [...next, ...fetched];
          // Re-sort
          next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          return next;
        });
      });
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [events]);

  if (!user) return null;

  return (
    <div className="space-y-4">
      {globalUpdates.length > 0 && (
         <div className="bg-[#E3F2FD] border border-[#BBDEFB] rounded-lg p-4 flex gap-3 overflow-x-auto custom-scrollbar">
           <div className="shrink-0 flex items-center justify-center p-2 rounded-full bg-white text-[#1976D2] self-center">
             <Bell className="w-5 h-5" />
           </div>
           <div className="flex gap-4 items-center whitespace-nowrap overflow-x-auto">
             {globalUpdates.slice(0, 5).map(update => (
               <div 
                 key={update.id} 
                 className={cn(
                   "inline-flex items-center gap-2 px-4 py-2 border rounded-full text-[13px] font-bold cursor-pointer transition-transform hover:scale-105",
                   update.type === 'alert' ? "bg-white border-[#FFCDD2] text-[#B71C1C]" :
                   update.type === 'warning' ? "bg-white border-[#FFECB3] text-[#F57F17]" :
                   "bg-white border-[#BBDEFB] text-[#0D47A1]"
                 )}
                 onClick={() => {
                   const ev = events.find(e => e.id === update.eventId);
                   if (ev) onSelectEvent(ev);
                 }}
               >
                 {update.type === 'alert' && <AlertCircle className="w-4 h-4 shrink-0" />}
                 {update.type === 'warning' && <AlertTriangle className="w-4 h-4 shrink-0" />}
                 {update.type === 'info' && <Info className="w-4 h-4 shrink-0" />}
                 <span><span className="opacity-70 font-medium">{update.eventName}:</span> {update.message}</span>
               </div>
             ))}
           </div>
         </div>
      )}

      {/* Role Specific Highlight Cards */}
      {user.role === 'student' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div onClick={() => setActiveView('digital-card')} className="bg-gradient-to-br from-[#1976D2] to-[#1565C0] rounded-lg p-5 text-white cursor-pointer hover:shadow-lg transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-10 group-hover:scale-110 transition-transform"><QrCode className="w-24 h-24" /></div>
             <h3 className="text-xl font-bold tracking-tight mb-1">My Digital ID</h3>
             <p className="text-white/80 text-[13px] mb-4">Your scanner code for recruiters.</p>
             <div className="flex items-center gap-2 text-sm font-bold bg-white/20 w-max px-3 py-1.5 rounded-md"><QrCode className="w-4 h-4"/> Show Code</div>
          </div>
          
          <div onClick={() => setActiveView('scholarship')} className="bg-[#FFF5F5] border border-[#FFCDD2] rounded-lg p-5 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-5 group-hover:scale-110 transition-transform"><GraduationCap className="w-24 h-24 text-[#D32F2F]" /></div>
             <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#D32F2F] shadow-sm mb-3 group-hover:scale-110 transition-transform"><GraduationCap className="w-5 h-5" /></div>
             <h3 className="text-lg font-bold text-[#1C1E21] mb-1">Scholarship Path</h3>
             <p className="text-[#606770] text-[13px]">Track your matched scholarships.</p>
          </div>

          <div onClick={() => setActiveView('workshops')} className="bg-[#F8F9FA] border border-[#E4E6EB] rounded-lg p-5 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-5 group-hover:scale-110 transition-transform"><Clock className="w-24 h-24 text-[#1C1E21]" /></div>
             <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#1C1E21] shadow-sm mb-3 group-hover:scale-110 transition-transform"><Clock className="w-5 h-5" /></div>
             <h3 className="text-lg font-bold text-[#1C1E21] mb-1">Workshops</h3>
             <p className="text-[#606770] text-[13px]">Plan your learning schedule.</p>
          </div>
        </div>
      )}

      {user.role === 'recruiter' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div onClick={() => setActiveView('lead-capture')} className="bg-gradient-to-br from-[#D32F2F] to-[#B71C1C] rounded-lg p-5 text-white cursor-pointer hover:shadow-lg transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-10 group-hover:scale-110 transition-transform"><ScanLine className="w-24 h-24" /></div>
             <h3 className="text-xl font-bold tracking-tight mb-1">Capture Leads</h3>
             <p className="text-white/80 text-[13px] mb-4">Scan student QR codes instantly.</p>
             <div className="flex items-center gap-2 text-sm font-bold bg-white/20 w-max px-3 py-1.5 rounded-md"><ScanLine className="w-4 h-4"/> Open Scanner</div>
          </div>

          <div onClick={() => setActiveView('leads')} className="bg-[#E3F2FD] border border-[#BBDEFB] rounded-lg p-5 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-5 group-hover:scale-110 transition-transform"><Users className="w-24 h-24 text-[#1976D2]" /></div>
             <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#1976D2] shadow-sm mb-3 group-hover:scale-110 transition-transform"><Users className="w-5 h-5" /></div>
             <h3 className="text-lg font-bold text-[#1C1E21] mb-1">My Leads DB</h3>
             <p className="text-[#606770] text-[13px]">Review and export captured students.</p>
          </div>
          
          <div onClick={() => setActiveView('floorplan')} className="bg-[#F8F9FA] border border-[#E4E6EB] rounded-lg p-5 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-5 group-hover:scale-110 transition-transform"><MapPin className="w-24 h-24 text-[#1C1E21]" /></div>
             <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#1C1E21] shadow-sm mb-3 group-hover:scale-110 transition-transform"><MapPin className="w-5 h-5" /></div>
             <h3 className="text-lg font-bold text-[#1C1E21] mb-1">Booth Map</h3>
             <p className="text-[#606770] text-[13px]">Locate your booth and scout the floor.</p>
          </div>
        </div>
      )}

      {user.role === 'parent' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div onClick={() => setActiveView('resources')} className="bg-gradient-to-br from-[#1A2233] to-[#121826] rounded-lg p-5 text-white cursor-pointer hover:shadow-lg transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-10 group-hover:scale-110 transition-transform"><Info className="w-24 h-24" /></div>
             <h3 className="text-xl font-bold tracking-tight mb-1">Guidance Resources</h3>
             <p className="text-white/80 text-[13px] mb-4">Exclusive webinars & checklists.</p>
             <div className="flex items-center gap-2 text-sm font-bold bg-white/20 w-max px-3 py-1.5 rounded-md"><Info className="w-4 h-4"/> View Library</div>
          </div>

          <div onClick={() => setActiveView('scholarship-corner')} className="bg-gradient-to-br from-[#FFF8E1] to-[#FFF3E0] border border-[#FFE082] rounded-lg p-5 cursor-pointer hover:shadow-lg transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-10 group-hover:scale-110 transition-transform"><Star className="w-24 h-24 text-[#F57F17]" /></div>
             <h3 className="text-xl font-bold tracking-tight mb-1 text-[#F57F17]">Premium Scholarships</h3>
             <p className="text-[#E65100]/80 text-[13px] mb-4 font-medium">Curated list for parents.</p>
             <div className="flex items-center gap-2 text-sm font-bold text-[#F57F17] w-max px-3 py-1.5 rounded-md"><Star className="w-4 h-4"/> Access Corner</div>
          </div>
          
          <div onClick={() => setActiveView('workshops')} className="bg-[#F8F9FA] border border-[#E4E6EB] rounded-lg p-5 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-5 group-hover:scale-110 transition-transform"><Clock className="w-24 h-24 text-[#1C1E21]" /></div>
             <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#1C1E21] shadow-sm mb-3 group-hover:scale-110 transition-transform"><Clock className="w-5 h-5" /></div>
             <h3 className="text-lg font-bold text-[#1C1E21] mb-1">Seminars & Panels</h3>
             <p className="text-[#606770] text-[13px]">Schedule for parents and guardians.</p>
          </div>
          
          <div onClick={() => setActiveView('floorplan')} className="bg-[#FFF5F5] border border-[#FFCDD2] rounded-lg p-5 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-5 group-hover:scale-110 transition-transform"><MapPin className="w-24 h-24 text-[#D32F2F]" /></div>
             <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#D32F2F] shadow-sm mb-3 group-hover:scale-110 transition-transform"><MapPin className="w-5 h-5" /></div>
             <h3 className="text-lg font-bold text-[#1C1E21] mb-1">Expo Floor</h3>
             <p className="text-[#606770] text-[13px]">Find colleges and support services.</p>
          </div>
        </div>
      )}

      {user.role === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div onClick={() => setActiveView('management')} className="bg-[#1C1E21] rounded-lg p-5 text-white cursor-pointer hover:shadow-lg transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-10 group-hover:scale-110 transition-transform"><Calendar className="w-24 h-24" /></div>
             <h3 className="text-xl font-bold tracking-tight mb-1">Event Management</h3>
             <p className="text-white/80 text-[13px] mb-4">Create and update Expo events.</p>
             <div className="flex items-center gap-2 text-sm font-bold bg-white/20 w-max px-3 py-1.5 rounded-md"><Calendar className="w-4 h-4"/> Manage Events</div>
          </div>

          <div onClick={() => setActiveView('broadcast')} className="bg-[#D32F2F] rounded-lg p-5 text-white cursor-pointer hover:shadow-lg transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-10 group-hover:scale-110 transition-transform"><Bell className="w-24 h-24" /></div>
             <h3 className="text-xl font-bold tracking-tight mb-1">Broadcast Hub</h3>
             <p className="text-white/80 text-[13px] mb-4">Send announcements and alerts.</p>
             <div className="flex items-center gap-2 text-sm font-bold bg-white/20 w-max px-3 py-1.5 rounded-md"><Bell className="w-4 h-4"/> Send Alert</div>
          </div>
          
          <div onClick={() => setActiveView('leads')} className="bg-[#E3F2FD] border border-[#BBDEFB] rounded-lg p-5 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-5 group-hover:scale-110 transition-transform"><Users className="w-24 h-24 text-[#1976D2]" /></div>
             <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#1976D2] shadow-sm mb-3 group-hover:scale-110 transition-transform"><Users className="w-5 h-5" /></div>
             <h3 className="text-lg font-bold text-[#1C1E21] mb-1">Attendees & Leads</h3>
             <p className="text-[#606770] text-[13px]">Monitor system engagement.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
      {/* Booth Map Area */}
      <div className="lg:h-[450px]">
        <BoothMap />
      </div>

      {/* Workshop/Seminar Area */}
      <div className="bg-white rounded-lg border border-[#E4E6EB] p-4 shadow-sm h-full overflow-hidden flex flex-col">
        <div className="text-[11px] font-bold uppercase text-[#606770] mb-4">Today's Workshops</div>
        <div className="space-y-4 overflow-y-auto flex-grow custom-scrollbar pr-2">
          {[
            { time: '09:30 AM', title: 'Scholarships 101', room: 'Room 302', speaker: 'Dr. Price' },
            { time: '11:15 AM', title: 'The HBCU Experience', room: 'Main Stage', speaker: 'Panel' },
            { time: '01:00 PM', title: 'Student Athlete Seminar', room: 'Room 305', speaker: 'Coach Bell' },
            { time: '02:30 PM', title: 'Financial Aid Basics', room: 'Room 302', speaker: 'FAFSA Team' },
          ].map((w, i) => {
            const happening = isWorkshopHappeningNow(w.time);
            const upcoming = isWorkshopUpcoming(w.time);
            return (
              <div key={i} className={cn("pb-3 border-b border-[#E4E6EB] last:border-0 group", happening ? "bg-[#FFF5F5] border-l-4 border-[#D32F2F] pl-2 -ml-2" : upcoming ? "bg-[#E3F2FD] border-l-4 border-[#1976D2] pl-2 -ml-2" : "")}>
                <div className="font-mono text-[11px] font-bold flex items-center gap-2 text-[#D32F2F]">
                  {w.time}
                  {happening && <span className="px-1.5 py-0.5 bg-[#D32F2F] text-white rounded text-[8px] uppercase font-black shadow-sm animate-pulse">Live</span>}
                  {upcoming && <span className="px-1.5 py-0.5 bg-[#1976D2] text-white rounded text-[8px] uppercase font-black shadow-sm">Upcoming</span>}
                </div>
                <div className="text-[13px] font-bold text-[#1C1E21] group-hover:text-[#1976D2] transition-colors">{w.title}</div>
                <div className="text-[11px] text-[#606770]">{w.room} • {w.speaker}</div>
              </div>
            );
          })}
        </div>
        
        {/* Quick Stats Integration */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#E4E6EB]">
          <div className="bg-[#F0F2F5] p-2 rounded-lg text-center">
            <span className="block text-lg font-bold">240</span>
            <span className="text-[9px] text-[#606770] uppercase font-bold">Colleges</span>
          </div>
          <div className="bg-[#F0F2F5] p-2 rounded-lg text-center">
            <span className="block text-lg font-bold">$10M+</span>
            <span className="text-[9px] text-[#606770] uppercase font-bold">Money</span>
          </div>
          <div className="bg-[#F0F2F5] p-2 rounded-lg text-center">
            <span className="block text-lg font-bold">12</span>
            <span className="text-[9px] text-[#606770] uppercase font-bold">Workshops</span>
          </div>
        </div>
      </div>

      {/* Timeline/Events Area */}
      <div className="lg:col-span-2 bg-white rounded-lg border border-[#E4E6EB] p-4 flex gap-4 overflow-x-auto shadow-sm no-scrollbar">
        {events.length === 0 ? (
          <div className="py-8 px-4 text-center w-full opacity-40 italic text-[13px]">No upcoming events scheduled.</div>
        ) : (
          events.map((event) => {
            const dateObj = new Date(event.date);
            // Handling timezone drift for simple YYYY-MM-DD strings
            const userDate = new Date(dateObj.getTime() + dateObj.getTimezoneOffset() * 60000);
            const monthShort = format(userDate, 'MMM');
            const dayNum = format(userDate, 'dd');

            return (
              <DateCard 
                key={event.id}
                month={monthShort} 
                day={dayNum} 
                city={event.city} 
                onClick={() => onSelectEvent(event)}
              />
            );
          })
        )}
        <div className="min-w-[140px] border border-dashed border-[#E4E6EB] rounded-lg p-3 flex flex-col items-center justify-center opacity-40">
           <span className="text-[10px] uppercase font-bold text-[#606770]">Coming Soon</span>
           <span className="text-[12px] font-semibold">More Dates</span>
        </div>
      </div>
     </div>
    </div>
  );
};

// --- App Root ---

const CalendarView = ({ events, onSelectEvent, setActiveView }: { events: ExpoEvent[], onSelectEvent: (event: ExpoEvent) => void, setActiveView: (view: string) => void }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-lg border border-[#E4E6EB] shadow-sm overflow-hidden"
    >
      <div className="p-4 border-b border-[#E4E6EB] flex items-center justify-between bg-[#F8F9FA]">
        <h3 className="text-[14px] font-bold text-[#1C1E21]">{format(currentDate, 'MMMM yyyy')}</h3>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-1.5 hover:bg-[#E4E6EB] rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4 text-[#606770]" />
          </button>
          <button onClick={nextMonth} className="p-1.5 hover:bg-[#E4E6EB] rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4 text-[#606770]" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 border-b border-[#E4E6EB]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-2 text-center text-[10px] font-bold uppercase text-[#606770] bg-white">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-[#E4E6EB]">
        {days.map((day, i) => {
          const dayEvents = events.filter(e => isSameDay(parseISO(e.date), day));
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());

          return (
            <div 
              key={i} 
              className={cn(
                "min-h-[100px] p-2 bg-white flex flex-col gap-1",
                !isCurrentMonth && "bg-[#F8F9FA] opacity-40"
              )}
            >
              <div className={cn(
                "text-[12px] font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                isToday ? "bg-[#D32F2F] text-white" : "text-[#1C1E21]"
              )}>
                {format(day, 'd')}
              </div>
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[70px] no-scrollbar">
                {dayEvents.map(event => (
                  <button
                    key={event.id}
                    onClick={() => onSelectEvent(event)}
                    className="text-[9px] font-bold text-left px-1.5 py-1 bg-[#E3F2FD] text-[#1976D2] border-l-2 border-[#1976D2] rounded truncate hover:bg-[#1976D2] hover:text-white transition-colors"
                  >
                    {event.city} Expo
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default function App() {
  const [fUser, setFUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [needsRole, setNeedsRole] = useState(false);
  const [dashboardMode, setDashboardMode] = useState<'list' | 'calendar'>('list');
  const [selectedEvent, setSelectedEvent] = useState<ExpoEvent | null>(null);
  const [isPromptDismissed, setIsPromptDismissed] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'settings' | 'management' | 'broadcast' | 'scholarship' | 'resources' | 'workshops' | 'floorplan' | 'digital-card' | 'lead-capture' | 'leads'>('dashboard');
  const [events, setEvents] = useState<ExpoEvent[]>([]);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<ExpoEvent | null>(null);

  // Manual Auth State
  const [authMode, setAuthMode] = useState<'google' | 'manual'>('google');
  const [manualEmail, setManualEmail] = useState('');
  const [manualPassword, setManualPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    let unsubscribeNotifs: (() => void) | null = null;
    let unsubscribeEvents: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setFUser(firebaseUser);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        let userRole: Role | undefined = undefined;
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as AppUser;
          setUser(userData);
          setNeedsRole(false);
          userRole = userData.role;

          // Notifications listener
          const qNotif = query(
            collection(db, `users/${firebaseUser.uid}/notifications`),
            orderBy('createdAt', 'desc')
          );
          unsubscribeNotifs = onSnapshot(qNotif, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
            setNotifications(notifs);
          }, (err) => {
            handleFirestoreError(err, OperationType.LIST, 'notifications');
          });

        } else {
          setNeedsRole(true);
        }

        // Events listener (Global)
        const eventsRef = collection(db, 'events');
        const qEvents = userRole === 'admin' 
          ? query(eventsRef, orderBy('date', 'asc'))
          : query(eventsRef, where('status', '==', 'published'), orderBy('date', 'asc'));
        
        unsubscribeEvents = onSnapshot(qEvents, (snapshot) => {
          const fetchedEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExpoEvent));
          // Manual fallback for drafts just in case
          const filtered = userRole === 'admin' 
            ? fetchedEvents 
            : fetchedEvents.filter(e => e.status !== 'draft'); 
          setEvents(filtered);
        });

      } else {
        setUser(null);
        setNeedsRole(false);
        setNotifications([]);
        setEvents([]);
        if (unsubscribeNotifs) unsubscribeNotifs();
        if (unsubscribeEvents) unsubscribeEvents();
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeNotifs) unsubscribeNotifs();
      if (unsubscribeEvents) unsubscribeEvents();
    };
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment_success');
    const paymentCancel = urlParams.get('payment_cancel');
    const subscriptionSuccess = urlParams.get('subscription_success');
    const subscriptionCancel = urlParams.get('subscription_cancel');
    const eventId = urlParams.get('eventId');
    
    if (paymentSuccess === 'true' && eventId && user && user.role === 'recruiter') {
      const unlockEvent = async () => {
         try {
           const unlockedEvents = user.unlockedEvents || [];
           if (!unlockedEvents.includes(eventId)) {
              await updateDoc(doc(db, 'users', user.uid), {
                unlockedEvents: [...unlockedEvents, eventId]
              });
              setUser({ ...user, unlockedEvents: [...unlockedEvents, eventId] });
           }
           setActiveView('lead-capture');
           if (eventId === 'all_events') {
             alert('Payment successful! You have unlocked QR Code scanning for ALL events.');
           } else {
             alert('Payment successful! You have unlocked QR Code scanning for this event.');
           }
           window.history.replaceState({}, document.title, window.location.pathname);
         } catch (error) {
           console.error('Error unlocking event:', error);
         }
      };
      unlockEvent();
    } else if (paymentCancel === 'true') {
      alert('Payment was cancelled.');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (subscriptionSuccess === 'true' && user) {
      const unlockSubscription = async () => {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            hasScholarshipAccess: true
          });
          setUser({ ...user, hasScholarshipAccess: true });
          setActiveView('scholarship-corner');
          alert('Subscription successful! You now have access to NCRF Scholarship Corner.');
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
           console.error('Error unlocking subscription:', error);
        }
      };
      unlockSubscription();
    } else if (subscriptionCancel === 'true') {
      alert('Subscription payment was cancelled.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  const markAsRead = async (notifId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/notifications`, notifId), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  };

  const handleSignIn = async (provider: any = googleProvider) => {
    setAuthError('');
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in popup closed. Please try again.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Ignore
      } else if (error.code === 'auth/popup-blocked') {
        setAuthError('Popup blocked by browser. Please allow popups.');
      } else {
        console.error('Sign in failed', error);
        setAuthError('Sign in failed. Try opening in a new tab.');
      }
    }
  };

  const handleFacebookSignIn = () => handleSignIn(facebookProvider);
  const handleAppleSignIn = () => handleSignIn(appleProvider);

  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!manualEmail || !manualPassword) return setAuthError('Please fill all fields');
    if (manualPassword.length < 6) return setAuthError('Password must be at least 6 characters');

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, manualEmail, manualPassword);
      } else {
        await signInWithEmailAndPassword(auth, manualEmail, manualPassword);
      }
    } catch (error: any) {
      console.error('Manual auth error:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setAuthError('Invalid email or password');
      } else if (error.code === 'auth/email-already-in-use') {
        setAuthError('Email already registered');
      } else if (error.code === 'auth/invalid-email') {
        setAuthError('Invalid email address');
      } else {
        setAuthError(error.message);
      }
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setForgotPasswordMsg('');
    if (!manualEmail) return setAuthError('Please enter your email address to reset your password');
    try {
      await sendPasswordResetEmail(auth, manualEmail);
      setForgotPasswordMsg('Password reset email sent. Please check your inbox.');
    } catch (error: any) {
      console.error('Password reset error:', error);
      if (error.code === 'auth/invalid-email') {
        setAuthError('Invalid email address');
      } else if (error.code === 'auth/user-not-found') {
        setAuthError('User not found');
      } else {
        setAuthError('Could not send reset email. Please try again later.');
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsLogoutConfirmOpen(false);
  };

  const handleUpdateProfile = async (updates: Partial<AppUser>) => {
    if (!user) return;
    try {
      const updatedUser = { ...user, ...updates };
      await updateDoc(doc(db, 'users', user.uid), updates);
      setUser(updatedUser);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleRoleSelection = async (role: Role) => {
    if (!fUser) return;
    const userData: AppUser = {
      uid: fUser.uid,
      email: fUser.email!,
      displayName: fUser.displayName || 'User',
      role: role,
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'users', fUser.uid), userData);
      setUser(userData);
      setNeedsRole(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'users');
    }
  };

  const isProfileIncomplete = user && (user.role === 'student' || user.role === 'parent') && (!user.school || !user.interests || user.interests.length === 0);

  if (loading) return <LoadingScreen />;

  return (
    <UserContext.Provider value={{ user, loading, signIn: handleSignIn, logout: () => setIsLogoutConfirmOpen(true), notifications, markAsRead }}>
      <ErrorBoundary>
        <NotificationCenter isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
        
        {/* Logout Confirmation Modal */}
        <AnimatePresence>
          {isLogoutConfirmOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4 text-center">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full"
              >
                <div className="w-16 h-16 bg-[#F0F2F5] text-[#D32F2F] rounded-full flex items-center justify-center mx-auto mb-6">
                  <LogOut className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-[#1C1E21] mb-2">Sign Out?</h3>
                <p className="text-[14px] text-[#606770] mb-8">
                  Are you sure you want to log out of the NCRF Foundation Portal?
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsLogoutConfirmOpen(false)}
                    className="flex-grow py-3 bg-[#F0F2F5] text-[#1C1E21] font-bold rounded-xl hover:bg-[#E4E6EB]"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="flex-grow py-3 bg-[#D32F2F] text-white font-bold rounded-xl hover:bg-black"
                  >
                    Log Out
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="min-h-screen bg-[#F0F2F5] font-sans flex text-[#1C1E21] selection:bg-[#E3F2FD] selection:text-[#1976D2]">
          
          {/* Theme Sidebar */}
          {user && (
            <aside className="w-[240px] bg-[#1A2233] text-white flex-shrink-0 flex flex-col p-5 h-screen sticky top-0">
              <div className="pb-6 border-b border-white/10 mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-lg border border-white/10">
                    <img src={LOGO_URL} alt="NCRF" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <div className="text-[12px] font-black tracking-tight leading-none">NCRF EXPO</div>
                    <div className="text-[9px] opacity-40 font-bold tracking-tighter">PORTAL SYSTEM</div>
                  </div>
                </div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-[#1976D2] mb-1">
                  {user.role} Portal
                </div>
                <div className="text-base font-semibold truncate">{user.displayName}</div>
                <div className="text-[11px] opacity-60 mt-1">NCRF Foundation</div>
              </div>
              <nav className="flex-grow overflow-y-auto no-scrollbar">
                <div className="space-y-6">
                  {/* General Navigation */}
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-3 px-2">Main Navigation</h3>
                    <ul className="space-y-1">
                      {[
                        { 
                          label: 'Event Dashboard', 
                          icon: Calendar,
                          active: activeView === 'dashboard' && !selectedEvent, 
                          onClick: () => { setSelectedEvent(null); setActiveView('dashboard'); setEventToEdit(null); }, 
                          roles: ['student', 'parent', 'admin'] 
                        },
                        { 
                          label: 'My Scholarship Path', 
                          icon: GraduationCap,
                          active: activeView === 'scholarship', 
                          onClick: () => setActiveView('scholarship'), 
                          roles: ['student'] 
                        },
                        { 
                          label: 'Student Portal', 
                          icon: LayoutDashboard,
                          active: activeView === 'digital-card', 
                          onClick: () => setActiveView('digital-card'), 
                          roles: ['student'] 
                        },
                        { 
                          label: 'Lead Capture Scan', 
                          icon: ScanLine,
                          active: activeView === 'lead-capture', 
                          onClick: () => setActiveView('lead-capture'), 
                          roles: ['recruiter', 'admin'] 
                        },
                        { 
                          label: 'Captured Leads', 
                          icon: Users,
                          active: activeView === 'leads', 
                          onClick: () => setActiveView('leads'), 
                          roles: ['recruiter', 'admin'] 
                        },
                        { 
                          label: 'Guidance Resources', 
                          icon: Users,
                          active: activeView === 'resources', 
                          onClick: () => setActiveView('resources'), 
                          roles: ['parent'] 
                        },
                        { 
                          label: 'Workshop Schedule', 
                          icon: Clock,
                          active: activeView === 'workshops', 
                          onClick: () => setActiveView('workshops'), 
                          roles: ['student', 'parent', 'admin'] 
                        },
                        { 
                          label: 'Booth Floor Plan', 
                          icon: MapIcon,
                          active: activeView === 'floorplan', 
                          onClick: () => setActiveView('floorplan'), 
                          roles: ['student', 'parent', 'admin'] 
                        },
                        { 
                          label: 'NCRF Scholarship Corner', 
                          icon: Star,
                          active: activeView === 'scholarship-corner', 
                          onClick: () => setActiveView('scholarship-corner'), 
                          roles: ['student', 'parent'] 
                        },
                        { 
                          label: 'NCRF Resources', 
                          icon: Info,
                          roles: ['student', 'parent', 'admin'],
                          onClick: () => window.open('https://www.ncrfoundation.org/', '_blank')
                        }
                      ]
                      .filter(item => item.roles.includes(user.role))
                      .map((item, i) => (
                        <li 
                          key={i} 
                          onClick={item.onClick}
                          className={cn(
                            "flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-all group",
                            item.active 
                              ? "bg-white/10 text-white shadow-sm" 
                              : "text-white/60 hover:text-white hover:bg-white/5"
                          )}
                        >
                          <item.icon className={cn(
                            "w-4 h-4 transition-colors",
                            item.active ? "text-[#1976D2]" : "text-white/40 group-hover:text-white/60"
                          )} />
                          <span className="text-[14px] font-medium">{item.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Admin Specific */}
                  {user.role === 'admin' && (
                    <div>
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-3 px-2">Management</h3>
                      <ul className="space-y-1">
                        {[
                          { 
                            label: 'Event Management', 
                            icon: CreditCard,
                            active: activeView === 'management', 
                            onClick: () => { setActiveView('management'); setEventToEdit(null); }, 
                            roles: ['admin'] 
                          },
                          { 
                            label: 'Broadcast Hub', 
                            icon: Bell,
                            active: activeView === 'broadcast', 
                            onClick: () => setActiveView('broadcast'), 
                            roles: ['admin'] 
                          }
                        ].map((item, i) => (
                          <li 
                            key={i} 
                            onClick={item.onClick}
                            className={cn(
                              "flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-all group",
                              item.active 
                                ? "bg-white/10 text-white shadow-sm" 
                                : "text-white/60 hover:text-white hover:bg-white/5"
                            )}
                          >
                            <item.icon className={cn(
                              "w-4 h-4 transition-colors",
                              item.active ? "text-[#D32F2F]" : "text-white/40 group-hover:text-white/60"
                            )} />
                            <span className="text-[14px] font-medium">{item.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Account Settings */}
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-3 px-2">Account</h3>
                    <ul className="space-y-1">
                      <li 
                        onClick={() => setActiveView('settings')}
                        className={cn(
                          "flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-all group",
                          activeView === 'settings' 
                            ? "bg-white/10 text-white shadow-sm" 
                            : "text-white/60 hover:text-white hover:bg-white/5"
                        )}
                      >
                        <UserIcon className={cn(
                          "w-4 h-4 transition-colors",
                          activeView === 'settings' ? "text-[#1976D2]" : "text-white/40 group-hover:text-white/60"
                        )} />
                        <span className="text-[14px] font-medium">Profile Settings</span>
                      </li>
                      <li 
                        onClick={() => setIsLogoutConfirmOpen(true)}
                        className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-all text-white/60 hover:text-[#D32F2F] hover:bg-red-500/5 group"
                      >
                        <LogOut className="w-4 h-4 text-white/40 group-hover:text-[#D32F2F]" />
                        <span className="text-[14px] font-medium">Log Out</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </nav>
              <div className="mt-auto text-[11px] opacity-40">
                © 2026 NCRF College Expo
              </div>
            </aside>
          )}

          <div className="flex-grow flex flex-col min-h-screen">
            <main className="p-4 flex-grow flex flex-col max-w-[1200px] mx-auto w-full">
              {!user ? (
                needsRole ? (
                  <div className="mt-12"><UserRoleSelector onSelect={handleRoleSelection} /></div>
                ) : (
                  <section className="flex-grow flex flex-col items-center justify-center p-6 text-center">
                     <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E3F2FD] border border-[#1976D2]/20 mb-8"
                    >
                      <span className="w-1.5 h-1.5 bg-[#1976D2] rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold text-[#1976D2] uppercase tracking-widest">Empowering Students Nationwide</span>
                    </motion.div>
                    
                    <motion.div
                       initial={{ opacity: 0, scale: 0.8 }}
                       animate={{ opacity: 1, scale: 1 }}
                       className="mb-10"
                     >
                       <img 
                        src={LOGO_URL} 
                        alt="NCRF Foundation" 
                        className="h-44 w-auto drop-shadow-2xl" 
                        referrerPolicy="no-referrer"
                       />
                     </motion.div>
                     <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-[#1C1E21] mb-6 leading-[0.9]">
                      National College Resources <br />
                      <span className="text-[#D32F2F]">Foundation Portal</span>
                    </h1>
                    
                    <p className="text-base text-[#606770] mb-8 font-medium max-w-lg mx-auto">
                      Access scholarship opportunities, college resources, and event maps. Start your educational journey today.
                    </p>
                    
                    <div className="w-full max-w-sm mx-auto">
                      {authError && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg text-left animate-shake">
                          {authError}
                        </div>
                      )}

                      {authMode === 'google' ? (
                        <div className="space-y-3">
                          <button 
                            onClick={() => handleSignIn()}
                            className="w-full h-[48px] bg-white border border-[#E4E6EB] text-[#1C1E21] font-bold rounded-lg flex items-center justify-center gap-3 hover:bg-[#F0F2F5] transition-all shadow-sm"
                          >
                            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" referrerPolicy="no-referrer" />
                            Continue with Google
                          </button>

                          <button 
                            onClick={handleFacebookSignIn}
                            className="w-full h-[48px] bg-[#1877F2] text-white font-bold rounded-lg flex items-center justify-center gap-3 hover:bg-[#166fe5] transition-all shadow-sm"
                          >
                            <Facebook className="w-4 h-4" />
                            Continue with Facebook
                          </button>

                          <button 
                            onClick={handleAppleSignIn}
                            className="w-full h-[48px] bg-black text-white font-bold rounded-lg flex items-center justify-center gap-3 hover:bg-[#1C1E21] transition-all shadow-sm"
                          >
                            <Apple className="w-4 h-4 fill-current" />
                            Continue with Apple
                          </button>
                          
                          <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#E4E6EB]"></div></div>
                            <div className="relative flex justify-center text-[11px] uppercase tracking-widest"><span className="bg-[#F0F2F5] px-2 text-[#8A8D91] font-bold">Or</span></div>
                          </div>

                          <button 
                            onClick={() => setAuthMode('manual')}
                            className="w-full h-[48px] bg-[#1A2233] text-white font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-black transition-all shadow-md"
                          >
                            <Mail className="w-4 h-4" />
                            Use Email Address
                          </button>
                        </div>
                      ) : (
                        <motion.div 
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-white border border-[#E4E6EB] p-8 rounded-2xl shadow-sm text-left relative overflow-hidden"
                        >
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-[#F8F9FA] rounded-lg flex items-center justify-center p-1.5 border border-[#E4E6EB]">
                              <img src={LOGO_URL} alt="NCRF" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                            </div>
                            <div>
                               <h3 className="text-[16px] font-black text-[#1C1E21] leading-none uppercase tracking-tighter">NCRF Portal</h3>
                               <p className="text-[10px] font-bold text-[#606770] uppercase tracking-widest mt-0.5">Member Access</p>
                            </div>
                          </div>

                          {!isForgotPassword && (
                            <div className="flex p-1 bg-[#F0F2F5] rounded-xl mb-6">
                              <button
                                type="button"
                                onClick={() => setIsSignUp(false)}
                                className={cn(
                                  "flex-grow py-2 text-[13px] font-bold rounded-lg transition-all",
                                  !isSignUp ? "bg-white text-[#1C1E21] shadow-sm" : "text-[#606770] hover:text-[#1C1E21]"
                                )}
                              >
                                Log In
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsSignUp(true)}
                                className={cn(
                                  "flex-grow py-2 text-[13px] font-bold rounded-lg transition-all",
                                  isSignUp ? "bg-white text-[#1C1E21] shadow-sm" : "text-[#606770] hover:text-[#1C1E21]"
                                )}
                              >
                                Sign Up
                              </button>
                            </div>
                          )}
                          
                          {isForgotPassword ? (
                            <form onSubmit={handleForgotPassword} className="space-y-4">
                              {forgotPasswordMsg && (
                                <div className="p-3 bg-[#E8F5E9] border border-[#C8E6C9] text-[#2E7D32] text-[12px] font-medium rounded-lg">
                                  {forgotPasswordMsg}
                                </div>
                              )}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-[#606770] tracking-wider pl-1 font-mono">Email Address</label>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8D91]" />
                                  <input 
                                    type="email" 
                                    value={manualEmail}
                                    onChange={(e) => setManualEmail(e.target.value)}
                                    className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded-xl pl-10 pr-4 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-[#1976D2]/20 focus:border-[#1976D2] transition-all"
                                    placeholder="name@school.edu"
                                  />
                                </div>
                              </div>
                              <button 
                                type="submit"
                                className="w-full py-3 bg-[#D32F2F] text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg active:scale-[0.98] mt-2"
                              >
                                Send Reset Link
                              </button>
                              <div className="pt-2 text-center text-[12px]">
                                <button 
                                  type="button" 
                                  onClick={() => { setIsForgotPassword(false); setForgotPasswordMsg(''); setAuthError(''); }}
                                  className="text-[#1976D2] font-semibold hover:underline"
                                >
                                  Back to Login
                                </button>
                              </div>
                            </form>
                          ) : (
                            <form onSubmit={handleManualAuth} className="space-y-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-[#606770] tracking-wider pl-1 font-mono">Email Address</label>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8D91]" />
                                  <input 
                                    type="email" 
                                    value={manualEmail}
                                    onChange={(e) => setManualEmail(e.target.value)}
                                    className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded-xl pl-10 pr-4 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-[#1976D2]/20 focus:border-[#1976D2] transition-all"
                                    placeholder="name@school.edu"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center pr-1">
                                  <label className="text-[10px] font-bold uppercase text-[#606770] tracking-wider pl-1 font-mono">Password</label>
                                  {!isSignUp && (
                                    <button 
                                      type="button" 
                                      onClick={() => { setIsForgotPassword(true); setAuthError(''); }}
                                      className="text-[10px] text-[#1976D2] font-bold hover:underline"
                                    >
                                      Forgot Password?
                                    </button>
                                  )}
                                </div>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8D91]" />
                                  <input 
                                    type="password" 
                                    value={manualPassword}
                                    onChange={(e) => setManualPassword(e.target.value)}
                                    className="w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded-xl pl-10 pr-4 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-[#1976D2]/20 focus:border-[#1976D2] transition-all"
                                    placeholder="••••••••"
                                  />
                                </div>
                              </div>

                              <button 
                                type="submit"
                                className="w-full py-3 bg-[#D32F2F] text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg active:scale-[0.98] mt-2"
                              >
                                {isSignUp ? 'Sign Up for Expo' : 'Log In to Portal'}
                              </button>
                            </form>
                          )}
                          
                          <button 
                            onClick={() => { setAuthMode('google'); setAuthError(''); }}
                            className="w-full mt-6 text-[11px] font-bold text-[#606770] hover:text-[#1C1E21] flex items-center justify-center gap-1 uppercase tracking-widest"
                          >
                            <ChevronLeft className="w-3 h-3" /> Back to Social Login
                          </button>
                        </motion.div>
                      )}
                    </div>

                    <p className="mt-8 text-[11px] text-[#606770] opacity-60 max-w-xs mx-auto">
                      By continuing, you agree to NCRF's Terms of Service and Privacy Policy.
                    </p>
                  </section>
                )
              ) : (
                <>
                  <Navbar onOpenNotifications={() => setIsNotificationsOpen(true)} />
                  {activeView === 'settings' ? (
                    <ProfileSettings user={user} onUpdate={handleUpdateProfile} />
                  ) : activeView === 'scholarship' && user?.role === 'student' ? (
                    <div className="max-w-5xl mx-auto py-6">
                      <div className="mb-8">
                        <h2 className="text-3xl font-black text-[#1C1E21] tracking-tight">Scholarship Center</h2>
                        <p className="text-[#606770] mt-1 font-medium italic">Empowering your future, one application at a time.</p>
                      </div>
                      <ScholarshipTracker />
                    </div>
                  ) : activeView === 'scholarship-corner' && (user?.role === 'student' || user?.role === 'parent') ? (
                    <div className="max-w-5xl mx-auto py-6">
                      <div className="mb-8">
                        <h2 className="text-3xl font-black text-[#1C1E21] tracking-tight flex items-center gap-2">
                          <Star className="text-[#F57F17]" />
                          NCRF Scholarship Corner
                        </h2>
                        <p className="text-[#606770] mt-1 font-medium italic">Exclusive, curated scholarship list for our premium members.</p>
                      </div>
                      <NCRFScholarshipCorner />
                    </div>
                  ) : activeView === 'workshops' ? (
                    <div className="max-w-4xl mx-auto py-6">
                      <div className="mb-8 flex items-center justify-between">
                        <div>
                          <h2 className="text-3xl font-black text-[#1C1E21] tracking-tight">Workshop Schedule</h2>
                          <p className="text-[#606770] mt-1 font-medium italic">Level up your college knowledge with expert-led sessions.</p>
                        </div>
                        <div className="bg-[#FFF5F5] text-[#D32F2F] px-4 py-2 rounded-xl border border-[#D32F2F]/10 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span className="text-[12px] font-bold uppercase tracking-wider">Live Sessions</span>
                        </div>
                      </div>
                      <div className="bg-white rounded-2xl border border-[#E4E6EB] shadow-sm overflow-hidden mb-6">
                        <div className="p-6 border-b border-[#F0F2F5] bg-gray-50/50">
                           <div className="flex items-center gap-4 text-[11px] font-bold text-[#606770] uppercase tracking-widest">
                             <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-[#D32F2F] rounded-full" /> Morning</div>
                             <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-[#1976D2] rounded-full" /> Afternoon</div>
                           </div>
                        </div>
                        <div className="divide-y divide-[#F0F2F5]">
                          {[
                            { time: '09:30 AM', title: 'Scholarships 101: Finding Free Money', room: 'Room 302', speaker: 'Dr. Theresa Price', desc: 'Expert tips on identifying and applying for scholarships that fit your profile.' },
                            { time: '10:30 AM', title: 'HBCU Panel: The Culture and Academic Excellence', room: 'Main Stage', speaker: 'Admissions Leaders', desc: 'Hear from leaders of top HBCUs about why they might be the right fit for you.' },
                            { time: '11:15 AM', title: 'Writing the Perfect Admissions Essay', room: 'Room 401', speaker: 'Prof. Miller', desc: 'Learn how to stand out in your application with a compelling personal statement.' },
                            { time: '01:00 PM', title: 'Student Athlete Seminar: Beyond the Field', room: 'Room 305', speaker: 'Coach Bell', desc: 'Essential information for students planning to compete in collegiate athletics.' },
                            { time: '02:30 PM', title: 'Financial Aid & FAFSA Mastery', room: 'Room 302', speaker: 'FAFSA Specialists', desc: 'Step-by-step guidance on completing your financial aid requirements.' },
                            { time: '03:45 PM', title: 'Career Pathways in STEM', room: 'Tech Lab 1', speaker: 'IBM & Google Mentors', desc: 'Discover high-demand careers and the educational paths that lead to them.' },
                          ].map((w, i) => {
                            const happening = isWorkshopHappeningNow(w.time);
                            const upcoming = isWorkshopUpcoming(w.time);
                            return (
                            <div key={i} className={cn("p-6 transition-colors group flex flex-col md:flex-row gap-4 md:items-start relative", happening ? "bg-[#FFF5F5]" : upcoming ? "bg-[#E3F2FD]" : "hover:bg-[#F8F9FA]")}>
                              {happening && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#D32F2F]"></div>}
                              {upcoming && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1976D2]"></div>}
                              <div className="md:w-32 flex-shrink-0">
                                <div className="font-mono text-[14px] text-[#D32F2F] font-black group-hover:scale-110 origin-left transition-transform flex items-center gap-2">
                                  {w.time}
                                </div>
                                <div className="flex gap-2 items-center mt-1">
                                  {happening && <span className="px-1.5 py-0.5 bg-[#D32F2F] text-white rounded text-[9px] uppercase font-black shadow-sm animate-pulse">Live</span>}
                                  {upcoming && <span className="px-1.5 py-0.5 bg-[#1976D2] text-white rounded text-[9px] uppercase font-black shadow-sm">Upcoming</span>}
                                </div>
                                <div className="text-[10px] uppercase font-bold text-[#606770] mt-1 group-hover:text-[#1976D2] transition-colors">{w.room}</div>
                              </div>
                              <div className="flex-grow">
                                <h4 className="text-[18px] font-black text-[#1C1E21] mb-1 group-hover:text-[#1976D2] transition-colors">{w.title}</h4>
                                <p className="text-[13px] text-[#606770] line-clamp-2 mb-3 leading-relaxed">{w.desc}</p>
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-[#E3F2FD] rounded-full flex items-center justify-center">
                                    <Users className="w-3 h-3 text-[#1976D2]" />
                                  </div>
                                  <span className="text-[12px] font-bold text-[#1C1E21]">{w.speaker}</span>
                                </div>
                              </div>
                              <button className="md:self-center px-4 py-2 bg-[#F0F2F5] text-[#606770] text-[11px] font-bold rounded-xl hover:bg-[#E4E6EB] hover:text-[#1C1E21] transition-all uppercase tracking-wider">
                                Add to My List
                              </button>
                            </div>
                          )})}
                        </div>
                      </div>
                    </div>
                  ) : activeView === 'floorplan' ? (
                    <div className="max-w-6xl mx-auto py-6 h-[calc(100vh-100px)] flex flex-col">
                      <div className="mb-6 flex items-center justify-between">
                        <div>
                          <h2 className="text-3xl font-black text-[#1C1E21] tracking-tight">Interactive Floor Plan</h2>
                          <p className="text-[#606770] mt-1 font-medium italic">Locate admissions booths, seminar rooms, and resources.</p>
                        </div>
                        <div className="flex gap-2">
                           <div className="bg-white border border-[#E4E6EB] px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
                             <div className="w-3 h-3 bg-[#E3F2FD] border border-[#1976D2]" />
                             <span className="text-[11px] font-bold uppercase text-[#606770]">Partners</span>
                           </div>
                           <div className="bg-white border border-[#E4E6EB] px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
                             <div className="w-3 h-3 bg-white border border-[#E4E6EB]" />
                             <span className="text-[11px] font-bold uppercase text-[#606770]">Exhibitors</span>
                           </div>
                        </div>
                      </div>
                      <div className="flex-grow">
                        <BoothMap />
                      </div>
                    </div>
                  ) : activeView === 'resources' && user?.role === 'parent' ? (
                    <div className="max-w-4xl mx-auto py-10">
                      <div className="mb-8">
                        <h2 className="text-3xl font-extrabold text-[#1C1E21]">Parental Guidance Resources</h2>
                        <p className="text-[#606770] mt-2">Supporting your child's journey to college success.</p>
                      </div>
                      <div className="bg-white rounded-2xl border border-[#E4E6EB] p-12 text-center shadow-sm">
                        <Users className="w-12 h-12 text-[#1976D2] mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-[#1C1E21] mb-2">Resource Library Under Preparation</h3>
                        <p className="text-[#606770] max-w-sm mx-auto text-[14px]">Access exclusive webinars, checklists, and expert advice specifically curated for parents and guardians.</p>
                      </div>
                    </div>
                  ) : activeView === 'digital-card' && user?.role === 'student' ? (
                    <StudentPortal user={user} setActiveView={setActiveView} />
                  ) : activeView === 'lead-capture' && (user?.role === 'recruiter' || user?.role === 'admin') ? (
                    <div className="max-w-4xl mx-auto py-6">
                      <div className="mb-8">
                        <h2 className="text-3xl font-black text-[#1C1E21] tracking-tight">Lead Capture Scan</h2>
                        <p className="text-[#606770] mt-1 font-medium italic">Scan student QR codes to instantly capture contact info and notes.</p>
                      </div>
                      <LeadScanner user={user!} events={events} />
                    </div>
                  ) : activeView === 'leads' && (user?.role === 'recruiter' || user?.role === 'admin') ? (
                    <div className="max-w-5xl mx-auto py-6">
                      <LeadsList user={user!} />
                    </div>
                  ) : activeView === 'management' && user?.role === 'admin' ? (
                    <AdminEventManager events={events} initialEditEvent={eventToEdit} />
                  ) : activeView === 'broadcast' && user?.role === 'admin' ? (
                    <div className="max-w-4xl mx-auto">
                      <div className="mb-8">
                        <h2 className="text-3xl font-extrabold text-[#1C1E21] tracking-tight">Broadcast Center</h2>
                        <p className="text-[#606770] mt-2 font-medium">Communicate urgent updates and announcements to the NCRF community.</p>
                      </div>
                      <NotificationBroadcaster />
                    </div>
                  ) : (activeView === 'management' || activeView === 'broadcast') && user?.role !== 'admin' ? (
                    <div className="flex flex-col items-center justify-center p-20 text-center">
                      <div className="w-16 h-16 bg-[#FFF5F5] text-[#D32F2F] rounded-full flex items-center justify-center mb-6">
                        <Lock className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-bold text-[#1C1E21] mb-2">Access Restricted</h3>
                      <p className="text-[14px] text-[#606770] max-w-sm mb-6">
                        You do not have the required permissions to access this administrative section.
                      </p>
                      <button 
                        onClick={() => setActiveView('dashboard')}
                        className="px-6 py-2 bg-[#1976D2] text-white font-bold rounded-lg text-[13px] hover:bg-[#1565C0] transition-all"
                      >
                        Return to Dashboard
                      </button>
                    </div>
                  ) : selectedEvent ? (
                    <EventDetails 
                      event={selectedEvent} 
                      onBack={() => { setSelectedEvent(null); setEventToEdit(null); }} 
                      onEdit={(e) => {
                        setEventToEdit(e);
                        setActiveView('management');
                        setSelectedEvent(null);
                      }}
                    />
                  ) : (
                    <div className="space-y-6">
                      {isProfileIncomplete && !isPromptDismissed && (
                        <ProfileCompletionPrompt onGoToSettings={() => setActiveView('settings')} onDismiss={() => setIsPromptDismissed(true)} />
                      )}
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-[#1C1E21] tracking-tight">Expo Dashboard</h2>
                        <div className="flex bg-white rounded-lg p-1 border border-[#E4E6EB] shadow-sm">
                          <button 
                            onClick={() => setDashboardMode('list')}
                            className={cn(
                              "px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-md transition-all",
                              dashboardMode === 'list' ? "bg-[#1A2233] text-white" : "text-[#606770] hover:bg-[#F0F2F5]"
                            )}
                          >
                            List View
                          </button>
                          <button 
                            onClick={() => setDashboardMode('calendar')}
                            className={cn(
                              "px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-md transition-all",
                              dashboardMode === 'calendar' ? "bg-[#1A2233] text-white" : "text-[#606770] hover:bg-[#F0F2F5]"
                            )}
                          >
                            Calendar
                          </button>
                        </div>
                      </div>

                      {dashboardMode === 'calendar' ? (
                        <CalendarView events={events} onSelectEvent={(e) => setSelectedEvent(e)} setActiveView={setActiveView} />
                      ) : (
                        <Dashboard events={events} onSelectEvent={(e) => setSelectedEvent(e)} setActiveView={setActiveView} />
                      )}
                    </div>
                  )}
                </>
              )}
            </main>

            {/* Sub-footer for non-logged-in users */}
            {!user && (
              <footer className="py-8 bg-white border-t border-[#E4E6EB]">
                <div className="max-w-7xl mx-auto px-4 text-center">
                   <p className="text-[11px] text-[#606770] font-medium">© 2026 National College Resources Foundation. A 501(c)(3) Non-Profit.</p>
                </div>
              </footer>
            )}
          </div>
        </div>
      </ErrorBoundary>
    </UserContext.Provider>
  );
}
