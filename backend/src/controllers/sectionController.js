/**
 * Section Controller
 * CRUD for test sections.
 * All routes sit under /api/tests/:testId/sections
 */

const Section = require('../models/Section');
const Test = require('../models/Test');

class SectionController {
  /**
   * GET /api/tests/:testId/sections
   */
  static async getSections(req, res) {
    try {
      const { testId } = req.params;

      const test = await Test.getById(testId);
      if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

      if (req.userRole !== 'admin' && test.recruiter_id !== req.userId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const sections = await Section.getByTest(testId);
      res.status(200).json({ success: true, data: { sections } });
    } catch (err) {
      console.error('getSections error:', err.message);
      res.status(500).json({ success: false, message: 'Failed to fetch sections' });
    }
  }

  /**
   * POST /api/tests/:testId/sections
   * Body: { title, description?, order_number?, questions_to_pick?, time_limit_minutes? }
   */
  static async createSection(req, res) {
    try {
      const { testId } = req.params;
      const { title, description, order_number, questions_to_pick, time_limit_minutes } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, message: 'Section title is required' });
      }

      const test = await Test.getById(testId);
      if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

      if (req.userRole !== 'admin' && test.recruiter_id !== req.userId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      // Prevent adding sections to a test that is already active/completed
      if (['active', 'completed'].includes(test.status)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot modify sections of a test that is already active or completed',
        });
      }

      const sectionId = await Section.create(testId, {
        title: title.trim(),
        description,
        order_number,
        questions_to_pick: questions_to_pick || null,
        time_limit_minutes: time_limit_minutes || null,
      });

      const section = await Section.getById(sectionId);
      res.status(201).json({ success: true, message: 'Section created', section });
    } catch (err) {
      console.error('createSection error:', err.message);
      res.status(500).json({ success: false, message: 'Failed to create section' });
    }
  }

  /**
   * PUT /api/sections/:sectionId
   */
  static async updateSection(req, res) {
    try {
      const { sectionId } = req.params;

      const section = await Section.getById(sectionId);
      if (!section) return res.status(404).json({ success: false, message: 'Section not found' });

      const test = await Test.getById(section.test_id);
      if (req.userRole !== 'admin' && test.recruiter_id !== req.userId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      if (['active', 'completed'].includes(test.status)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot modify a section while the test is active or completed',
        });
      }

      await Section.update(sectionId, req.body);
      const updated = await Section.getById(sectionId);
      res.status(200).json({ success: true, message: 'Section updated', section: updated });
    } catch (err) {
      console.error('updateSection error:', err.message);
      res.status(500).json({ success: false, message: 'Failed to update section' });
    }
  }

  /**
   * DELETE /api/sections/:sectionId
   * Questions in this section lose their section_id (set to NULL by FK).
   */
  static async deleteSection(req, res) {
    try {
      const { sectionId } = req.params;

      const section = await Section.getById(sectionId);
      if (!section) return res.status(404).json({ success: false, message: 'Section not found' });

      const test = await Test.getById(section.test_id);
      if (req.userRole !== 'admin' && test.recruiter_id !== req.userId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      if (['active', 'completed'].includes(test.status)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete a section while the test is active or completed',
        });
      }

      await Section.delete(sectionId);
      res.status(200).json({ success: true, message: 'Section deleted. Questions in this section are now unsectioned.' });
    } catch (err) {
      console.error('deleteSection error:', err.message);
      res.status(500).json({ success: false, message: 'Failed to delete section' });
    }
  }
}

module.exports = SectionController;