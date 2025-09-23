import { useState } from 'react';
import { Header } from './Header';
import '../styles/PrivateGradeApp.css';
import { TeacherPanel } from './TeacherPanel';
import { StudentPanel } from './StudentPanel';
import { AdminPanel } from './AdminPanel';


export function PrivateGradeApp() {
  const [activeTab, setActiveTab] = useState<'teacher' | 'student' | 'admin'>('teacher');

  return (
    <div className="pg-app">
      <Header />
      <main className="main-content">
        <div>
          <div className="tab-navigation">
            <nav className="tab-nav">
              <button
                onClick={() => setActiveTab('teacher')}
                className={`tab-button ${activeTab === 'teacher' ? 'active' : 'inactive'}`}
              >
                Teacher
              </button>
              <button
                onClick={() => setActiveTab('student')}
                className={`tab-button ${activeTab === 'student' ? 'active' : 'inactive'}`}
              >
                Student
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`tab-button ${activeTab === 'admin' ? 'active' : 'inactive'}`}
              >
                Admin
              </button>

            </nav>
          </div>

          {activeTab === 'teacher' && <TeacherPanel />}
          {activeTab === 'student' && <StudentPanel />}

          {activeTab === 'admin' && <AdminPanel />}
        </div>
      </main>
    </div>
  );
}
