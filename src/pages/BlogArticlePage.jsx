import { useParams, useNavigate } from 'react-router-dom';
import { articles } from '../data/index.js';

export default function BlogArticlePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const article = articles.find(a => a.slug === slug);

  if (!article) return (
    <div style={{padding:'60px 24px',textAlign:'center'}}>
      <h2 style={{color:'var(--blue)',marginBottom:'16px'}}>Article not found</h2>
      <button className="btn btn-secondary" onClick={() => navigate('/blog')}>Back to Blog</button>
    </div>
  );

  return (
    <>
      <div className="article-hero">
        <div className="container">
          <div className="breadcrumb" style={{marginBottom:'10px'}}>
            Home <i className="fa-solid fa-chevron-right"></i>
            <span style={{cursor:'pointer',color:'rgba(255,255,255,0.5)'}} onClick={() => navigate('/blog')}>Blog</span>
            <i className="fa-solid fa-chevron-right"></i>
            <span>{article.category}</span>
          </div>
          <div className="article-badge">{article.category}</div>
          <h1 className="article-title">{article.title}</h1>
          <div className="article-meta-bar">
            <span><i className="fa-regular fa-calendar"></i> {article.date}</span>
            <span><i className="fa-regular fa-clock"></i> {article.readTime}</span>
            <span><i className="fa-solid fa-user-tie"></i> {article.author}</span>
          </div>
        </div>
      </div>
      <div className="container">
        <div className="article-layout">
          <div className="article-body" dangerouslySetInnerHTML={{ __html: article.body }} />
          <div className="article-sidebar">
            <div className="sidebar-card">
              <div className="sidebar-card-title">Related Articles</div>
              {articles.filter(a => a.slug !== slug).slice(0,3).map((a,i) => (
                <div className="related-art" key={i} onClick={() => navigate(`/blog/${a.slug}`)}>
                  <div className={`related-thumb bt-${['blue','orange','green'][i]}`}>{['📋','⚖️','📊'][i]}</div>
                  <div>
                    <div className="related-title">{a.title}</div>
                    <div className="related-cat">{a.category}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="sidebar-card" style={{background:'var(--blue)',borderColor:'transparent'}}>
              <div className="sidebar-card-title" style={{color:'#FFD09B',borderColor:'rgba(255,255,255,0.15)'}}>Join FIP Today</div>
              <p style={{fontSize:'13px',color:'rgba(255,255,255,0.6)',marginBottom:'14px'}}>Get access to all articles, recordings, and courses for just ₹500/year.</p>
              <button className="btn btn-primary btn-sm" style={{width:'100%',justifyContent:'center'}} onClick={() => navigate('/membership')}>Join for ₹500</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}